import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  ITransaction,
  ITransactionCreate,
  TransactionsModel,
  TransactionStatus,
} from '../models/transactions.model';
import { NextFunction, Request, Response } from 'express';
import { IUser, UserRoles } from '../models/users.model';
import { getSafeSwaggerParam, getSelectAsColumns, getSortFields } from '../services/util.service';
import { ErrorCode, LogicError } from '../services/error.service';
import { Maybe } from '../@types';
import { TableName } from '../services/table-schemas.service';
import { DronePriceActionType, DronePricesModel } from '../models/drone-prices.model';
import { DroneStatus } from '../models/drones.model';
import { Decimal } from 'decimal.js';

@injectable()
export class TransactionsController {
  constructor(
    @inject(TYPES.TransactionModel) transactionModel: TransactionsModel,
    @inject(TYPES.DronePriceModel) dronePriceModel: DronePricesModel,
  ) {
    return {
      async getTransactions(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const isCustomer = isCustomerOnly(user);
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];
          const transactionIds = getSafeSwaggerParam<string[]>(req, 'transaction-ids');
          const priceIds = getSafeSwaggerParam<string[]>(req, 'price-ids');
          const userIds = getSafeSwaggerParam<string[]>(req, 'user-ids');
          if (userIds && isCustomer) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          const createdAtLimits = (getSafeSwaggerParam<string[]>(
            req,
            'created-at-limits',
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as Maybe<[string, string]>;
          const periodLimits = getSafeSwaggerParam<[number, number]>(req, 'period-limits');
          const statuses = getSafeSwaggerParam<TransactionStatus[]>(req, 'statuses');
          const sortings = getSortFields(
            getSafeSwaggerParam<string[]>(req, 'sort'),
            TableName.Transactions,
          );

          let query;
          if (isCustomer) {
            query = transactionModel.table.where('userId', user.userId).columns(select);

            if (transactionIds) {
              query.whereIn('transactionId', transactionIds);
            }
            if (priceIds) {
              query.whereIn('priceId', priceIds);
            }
            if (createdAtLimits) {
              query.andWhereBetween('createdAt', createdAtLimits);
            }
            if (periodLimits) {
              query.andWhereBetween('period', periodLimits);
            }
            if (statuses) {
              query.whereIn('status', statuses);
            }

            console.debug(query.toSQL());
            res.json(await query);
          } else {
            query = transactionModel.table
              .join(
                TableName.DronePrices,
                `${TableName.Transactions}.priceId`,
                `${TableName.DronePrices}.priceId`,
              ).join(
                TableName.Drones,
                `${TableName.DronePrices}.droneId`,
                `${TableName.Drones}.droneId`,
              );
            if (user.role & UserRoles.CUSTOMER) {
              query.andWhere(function () {
                this.where(`${TableName.Drones}.ownerId`, user.userId)
                  .orWhere(`${TableName.Transactions}.userId`, user.userId);
              });
            } else {
              query.andWhere(`${TableName.Drones}.ownerId`, user.userId);
            }

            if (transactionIds) {
              query.whereIn(`${TableName.Transactions}.transactionId`, transactionIds);
            }
            if (priceIds) {
              query.whereIn(`${TableName.Transactions}.priceId`, priceIds);
            }
            if (createdAtLimits) {
              query.andWhereBetween(`${TableName.Transactions}.createdAt`, createdAtLimits);
            }
            if (periodLimits) {
              query.andWhereBetween(`${TableName.Transactions}.period`, periodLimits);
            }
            if (statuses) {
              query.whereIn(`${TableName.Transactions}.status`, statuses);
            }
          }
          if (sortings) {
            for (const [column, direction] of sortings) {
              query.orderBy(column, direction);
            }
          }

          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async initiateTransaction(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];
          const transaction = (
            req as any
          ).swagger.params.transaction.value as ITransactionCreate;

          const dronePriceData = await dronePriceModel.table.columns([
            `${TableName.DronePrices}.actionType as actionType`,
            `${TableName.DronePrices}.isActive as isActive`,
            `${TableName.DronePrices}.price as price`,
            `${TableName.Drones}.status as droneStatus`,
            `${TableName.Drones}.ownerId as ownerId`,
          ]).join(
            TableName.Drones,
            `${TableName.DronePrices}.droneId`,
            `${TableName.Drones}.droneId`,
          ).where({ priceId: transaction.priceId });
          if (dronePriceData.length === 0) {
            next(new LogicError(ErrorCode.TRANSACTION_PRICE_ID));
            return;
          }

          const droneInfo = dronePriceData[0];
          if (droneInfo.droneStatus !== DroneStatus.IDLE) {
            next(new LogicError(ErrorCode.DRONE_STATUS_BAD));
            return;
          }
          if (droneInfo.ownerId === user.userId) {
            next(new LogicError(ErrorCode.TRANSACTION_USER_SAME));
            return;
          }
          switch (droneInfo.actionType) {
            case DronePriceActionType.RENTING: {
              if (!(user.role & UserRoles.CUSTOMER)) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
              if (typeof transaction.period !== 'number') {
                next(new LogicError(ErrorCode.TRANSACTION_PERIOD));
                return;
              }
              if (new Decimal(droneInfo.price).mul(transaction.period).greaterThan(user.cash!)) {
                next(new LogicError(ErrorCode.TRANSACTION_CASH));
                return;
              }
              break;
            }

            case DronePriceActionType.SELLING: {
              if (!(user.role & UserRoles.OWNER)) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
              if (typeof transaction.period === 'number') {
                next(new LogicError(ErrorCode.TRANSACTION_PERIOD));
                return;
              }
              if (new Decimal(droneInfo.price).greaterThan(user.cash!)) {
                next(new LogicError(ErrorCode.TRANSACTION_CASH));
                return;
              }
              break;
            }
          }

          await transactionModel.table.insert({
            ...transaction,
            userId: user.userId,
          });

          if (select && select.length > 0) {
            res.json(
              (await transactionModel.table.columns(select)
                  .where({
                    userId: user.userId,
                    priceId: transaction.priceId,
                  }).whereIn('transactionId', transactionModel.table.max('transactionId'))
              )[0],
            );
          } else {
            res.json({});
          }
        } catch (err) {
          next(err);
        }
      },

      async getTransaction(req: Request, res: Response, next: NextFunction) {
        try {
          const transactionId = (
            req as any
          ).swagger.params.transactionId.value as string;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];

          const hadPeriod = select.includes('period');
          if (!hadPeriod) {
            select.push('period');
          }
          const columns = getSelectAsColumns(select, TableName.Transactions);

          const dronePriceData = await dronePriceModel.table.columns([
              ...columns,
            // `${TableName.DronePrices}.actionType as actionType`,
            // `${TableName.DronePrices}.isActive as isActive`,
            `${TableName.DronePrices}.price as price`,
            `${TableName.Drones}.status as droneStatus`,
            `${TableName.Drones}.ownerId as ownerId`,
          ]).join(
            TableName.DronePrices,
            `${TableName.Transactions}.priceId`,
            `${TableName.DronePrices}.priceId`,
          ).join(
            TableName.Drones,
            `${TableName.DronePrices}.droneId`,
            `${TableName.Drones}.droneId`,
          ).where({ transactionId });
          if (dronePriceData.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

          const droneInfo = dronePriceData[0];
        } catch (err) {
          next(err);
        }
      },
    };
  }
}

function isCustomerOnly(user: IUser) {
  return user.role & UserRoles.CUSTOMER
    && !!(user.role & UserRoles.OWNER)
    && !!(user.role & UserRoles.LANDLORD);
}
