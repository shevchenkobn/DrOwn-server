import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  ITransaction,
  ITransactionCreate,
  TransactionsModel,
  TransactionStatus,
} from '../models/transactions.model';
import { NextFunction, Request, Response } from 'express';
import { IUser, UserModel, UserRoles, UserStatus } from '../models/users.model';
import {
  appendOrderBy,
  getSafeSwaggerParam,
  getSelectAsColumns,
  getSortFields,
  mapObject,
} from '../services/util.service';
import { ErrorCode, LogicError } from '../services/error.service';
import { Maybe } from '../@types';
import { TableName } from '../services/table-names';
import { DronePriceActionType, DronePricesModel } from '../models/drone-prices.model';
import { DroneModel, DroneStatus } from '../models/drones.model';
import { Decimal } from 'decimal.js';
import { DbConnection } from '../services/db-connection.class';
import { scheduleTimer } from '../services/scheduler.service';
import { container } from '../di/container';
import * as Knex from 'knex';

@injectable()
export class TransactionsController {
  constructor(
    @inject(TYPES.TransactionModel) transactionModel: TransactionsModel,
    @inject(TYPES.DronePriceModel) dronePriceModel: DronePricesModel,
    @inject(TYPES.UserModel) userModel: UserModel,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.DbConnection) dbConnection: DbConnection,
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
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as ([Date, Date] | []);
          const periodLimits = getSafeSwaggerParam<[number, number]>(req, 'period-limits');
          const statuses = getSafeSwaggerParam<TransactionStatus[]>(req, 'statuses');
          const sortings = getSortFields(
            getSafeSwaggerParam<string[]>(req, 'sort'),
            TableName.Transactions,
          );

          let query;
          if (isCustomer) {
            query = transactionModel.table.where('userId', user.userId).columns(select);
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
          }

          if (transactionIds) {
            query.whereIn(`${TableName.Transactions}.transactionId`, transactionIds);
          }
          if (priceIds) {
            query.whereIn(`${TableName.Transactions}.priceId`, priceIds);
          }
          if (createdAtLimits.length > 0) {
            query.andWhereBetween(`${TableName.Transactions}.createdAt`, createdAtLimits as any);
          }
          if (periodLimits) {
            query.andWhereBetween(`${TableName.Transactions}.period`, periodLimits);
          }
          if (statuses) {
            query.whereIn(`${TableName.Transactions}.status`, statuses);
          }
          appendOrderBy(query, sortings);

          console.debug(query.toQuery());
          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async initiateTransaction(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          if (user.status === UserStatus.BLOCKED) {
            next(new LogicError(ErrorCode.USER_BLOCKED));
            return;
          }

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
          if (droneInfo.ownerId === user.userId) {
            next(new LogicError(ErrorCode.TRANSACTION_USER_SAME));
            return;
          }
          if (droneInfo.droneStatus !== DroneStatus.IDLE) {
            next(new LogicError(ErrorCode.DRONE_STATUS_BAD));
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
            res.status(201).json(
              (await transactionModel.table.columns(select)
                  .where({
                    userId: user.userId,
                    priceId: transaction.priceId,
                  }).whereIn('transactionId', transactionModel.table.max('transactionId'))
              )[0],
            );
          } else {
            res.status(201).json({});
          }
        } catch (err) {
          next(err);
        }
      },

      async getTransaction(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (
            req as any
          ).user as IUser;
          const transactionId = (
            req as any
          ).swagger.params.transactionId.value as string;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];
          const hadUserId = select.includes('userId');

          if (!hadUserId) {
            select.push('userId');
          }
          const columns = getSelectAsColumns(select, TableName.Transactions);

          const dronePriceData = await dronePriceModel.table.columns([
            ...columns,
            // `${TableName.DronePrices}.isActive as isActive`,
            `${TableName.Drones}.ownerId as ownerId`,
          ])
            .join(
              TableName.DronePrices,
              `${TableName.Transactions}.priceId`,
              `${TableName.DronePrices}.priceId`,
            )
            .join(
              TableName.Drones,
              `${TableName.DronePrices}.droneId`,
              `${TableName.Drones}.droneId`,
            )
            .where({ transactionId });
          if (dronePriceData.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

          const droneInfo = dronePriceData[0];
          if (droneInfo.ownerId !== user.userId || droneInfo.userId !== user.userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          if (!select || select.length === 0 || !hadUserId && select.length === 1) {
            res.json(mapObject(droneInfo, select, TableName.Transactions));
          } else {
            res.json(mapObject(
              droneInfo,
              hadUserId ? select : select.slice(0, -1),
              TableName.Transactions,
            ));
          }
        } catch (err) {
          next(err);
        }
      },

      async confirmTransaction(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          if (user.status === UserStatus.BLOCKED) {
            next(new LogicError(ErrorCode.USER_BLOCKED));
            return;
          }

          const transactionId = (
            req as any
          ).swagger.params.transactionId.value as string;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];

          const dronePriceData = await dronePriceModel.table.columns([
            `${TableName.Transactions}.status as status`,
            `${TableName.Transactions}.period as period`,
            `${TableName.Transactions}.userId as userId`,
            // `${TableName.DronePrices}.isActive as isActive`,
            `${TableName.DronePrices}.price as price`,
            `${TableName.DronePrices}.actionType as actionType`,
            `${TableName.DronePrices}.droneId as droneId`,
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
          if (droneInfo.ownerId !== user.userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          if (droneInfo.status !== TransactionStatus.PENDING) {
            next(new LogicError(ErrorCode.TRANSACTION_STATUS_BAD));
            return;
          }
          if (droneInfo.droneStatus !== DroneStatus.IDLE) {
            next(new LogicError(ErrorCode.DRONE_STATUS_BAD));
            return;
          }
          switch (droneInfo.actionType) {
            case DronePriceActionType.RENTING: {
              const sum = new Decimal(droneInfo.price).mul(droneInfo.period);
              if (sum.greaterThan(user.cash!)) {
                next(new LogicError(ErrorCode.TRANSACTION_CASH));
                return;
              }
              await dbConnection.knex.transaction(async trx => {
                try {
                  await userModel.table
                    .where({ userId: droneInfo.userId })
                    .update({
                      cash: dbConnection.knex.raw(`cash - ${sum.toString()}`), // maybe problem
                    })
                    .transacting(trx);
                  await droneModel.table
                    .where({ ownerId: droneInfo.userId })
                    .update({ status: DroneStatus.RENTED })
                    .transacting(trx);
                  await userModel.table
                    .where({ userId: user.userId })
                    .update({
                      cash: dbConnection.knex.raw(`cash + ${sum.toString()}`), // maybe problem
                    })
                    .transacting(trx);
                  await transactionModel.table
                    .update({ status: TransactionStatus.CONFIRMED })
                    .where({ transactionId })
                    .transacting(trx);
                } catch (err) {
                  trx.rollback(err);
                }
              });
              break;
            }

            case DronePriceActionType.SELLING: {
              if (new Decimal(droneInfo.price).greaterThan(user.cash!)) {
                next(new LogicError(ErrorCode.TRANSACTION_CASH));
                return;
              }
              await dbConnection.knex.transaction(async trx => {
                try {
                  await userModel.table
                    .where({ userId: droneInfo.userId })
                    .update({
                      cash: dbConnection.knex.raw(`cash - ${droneInfo.price}`), // maybe problem
                    })
                    .transacting(trx);
                  await droneModel.table
                    .where({ ownerId: droneInfo.userId })
                    .update({ status: DroneStatus.RENTED })
                    .transacting(trx);
                  scheduleDroneUpdate(droneModel, droneInfo.droneId, droneInfo.period * 3600);
                  // scheduleTimer(() => {
                  //   droneModel.update(
                  //     { status: DroneStatus.IDLE },
                  //     { droneId: droneInfo.droneId },
                  //   ).catch((err) => {
                  //     console.error(err);
                  //     console.error('renting stop failed');
                  //   });
                  // }, droneInfo.period * 3600);
                  await userModel.table
                    .where({ userId: user.userId })
                    .update({
                      cash: dbConnection.knex.raw(`cash + ${droneInfo.price}`), // maybe problem
                    })
                    .transacting(trx);
                  await transactionModel.table
                    .update({ status: TransactionStatus.CONFIRMED })
                    .where({ transactionId })
                    .transacting(trx);
                } catch (err) {
                  trx.rollback(err);
                }
              });
              break;
            }
          }

          if (select && select.length > 0) {
            res.json(
              (await transactionModel.select(select, { transactionId }))[0],
            );
          } else {
            res.json({});
          }
        } catch (err) {
          next(err);
        }
      },

      async rejectTransaction(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          if (user.status === UserStatus.BLOCKED) {
            next(new LogicError(ErrorCode.USER_BLOCKED));
            return;
          }

          const transactionId = (
            req as any
          ).swagger.params.transactionId.value as string;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];

          const dronePriceData = await dronePriceModel.table.columns([
            `${TableName.Transactions}.status as status`,
            `${TableName.Transactions}.userId as userId`,
            // `${TableName.DronePrices}.isActive as isActive`,
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
          if (droneInfo.ownerId !== user.userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          if (droneInfo.status !== TransactionStatus.PENDING) {
            next(new LogicError(ErrorCode.TRANSACTION_STATUS_BAD));
            return;
          }
          if (droneInfo.droneStatus !== DroneStatus.IDLE) {
            next(new LogicError(ErrorCode.DRONE_STATUS_BAD));
            return;
          }

          await transactionModel.table
            .where({ transactionId })
            .update({ status: TransactionStatus.REJECTED });

          res.json(
            (await transactionModel.select(select, { transactionId }))[0],
          );
        } catch (err) {
          next(err);
        }
      },
    };
  }
}

export function restoreRentingSchedule() {
  const db = container.get<DbConnection>(TYPES.DbConnection);
  const droneModel = container.get<DroneModel>(TYPES.DroneModel);

  if (container.get<DbConnection>(TYPES.DbConnection).config.client !== 'mysql') {
    throw new TypeError('Restoring renting queue is not supported for this DB driver');
  }
  const knex = db.knex;

  const update = (async () => {
    const dronesAlias = TableName.Drones.split('').reverse().join('');
    await knex.schema.raw(`CREATE TEMPORARY TABLE ${knex.raw('??', [dronesAlias])} ${knex(TableName.Drones)
      .columns([
        `${TableName.Drones}.droneId as droneId`,
      ])
      .join(
        TableName.DronePrices,
        `${TableName.Drones}.droneId`,
        `${TableName.DronePrices}.droneId`,
      )
      .join(
        TableName.Transactions,
        `${TableName.DronePrices}.priceId`,
        `${TableName.Transactions}.priceId`,
      )
      .where(`${TableName.Transactions}.status`, TransactionStatus.CONFIRMED)
      .andWhere(`${TableName.Drones}.status`, DroneStatus.RENTED)
      .whereRaw(
        `${knex.raw('??.??', [TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [TableName.Transactions, 'period'])} * 60 * 60) < now()`,
      )}`);
    await knex(TableName.Drones)
      .whereIn(
        'droneId',
        function () {
          this.column('droneId').from(dronesAlias);
        },
      )
      .update({
        status: DroneStatus.IDLE,
      });
    // knex.schema.raw(knex.raw('DROP VIEW ?? IF EXISTS', [dronesAlias]).toQuery()),
    await knex.schema.dropTable(dronesAlias);
  })();

  const select = knex(TableName.Transactions)
    .columns([
      `${TableName.DronePrices}.droneId as droneId`,
      knex.raw(
        `${knex.raw('??.??', [TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [TableName.Transactions, 'period'])} * 60 * 60) as ${knex.raw('??', ['timeout'])}`,
      ),
    ])
    .join(
      TableName.DronePrices,
      `${TableName.Transactions}.priceId`,
      `${TableName.DronePrices}.priceId`,
    )
    .havingRaw(`${knex.raw('??', ['timeout'])} > NOW()`)
    .andWhere(`${TableName.Transactions}.status`, TransactionStatus.CONFIRMED)
    .then((transactions: { droneId: string, timeout: Date }[]) => {
      for (const { droneId, timeout } of transactions) {
        scheduleDroneUpdate(droneModel, droneId, timeout.getTime() - Date.now());
      }
    });
  return Promise.all([update, select]);
}

function isCustomerOnly(user: IUser) {
  return user.role & UserRoles.CUSTOMER
    && !!(user.role & UserRoles.OWNER)
    && !!(user.role & UserRoles.LANDLORD);
}

function scheduleDroneUpdate(droneModel: DroneModel, droneId: string, timeout: number) {
  scheduleTimer(() => {
    droneModel.update(
      { status: DroneStatus.IDLE },
      { droneId },
    ).catch((err) => {
      console.error(err);
      console.error('renting stop failed');
    });
  }, timeout);
}
