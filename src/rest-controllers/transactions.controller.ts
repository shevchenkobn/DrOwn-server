import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  ITransaction,
  ITransactionCreate,
  TransactionsModel,
} from '../models/transactions.model';
import { NextFunction, Request, Response } from 'express';
import { IUser, UserModel, UserRoles } from '../models/users.model';
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
    @inject(TYPES.UserModel) userModel: UserModel,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.DbConnection) dbConnection: DbConnection,
  ) {
    return {
      async getTransactions(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];
          const transactionIds = getSafeSwaggerParam<string[]>(req, 'transaction-ids');
          const droneIds = getSafeSwaggerParam<string[]>(req, 'drone-ids');
          const userIds = getSafeSwaggerParam<string[]>(req, 'user-ids');
          const createdAtLimits = (getSafeSwaggerParam<string[]>(
            req,
            'created-at-limits',
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as ([Date, Date] | []);
          const periodLimits = getSafeSwaggerParam<[number, number]>(req, 'period-limits');
          const sortings = getSortFields(
            getSafeSwaggerParam<string[]>(req, 'sort'),
            TableName.Transactions,
          );

          let query;
          if (user.role & UserRoles.OWNER) {
            query = transactionModel.table
              .join(
                TableName.Drones,
                `${TableName.Transactions}.droneId`,
                `${TableName.Drones}.droneId`,
              )
              .where(`${TableName.Drones}.ownerId`, user.userId);
          } else {
            query = transactionModel.table.where('userId', user.userId);
          }

          if (userIds) {
            query.whereIn(`${TableName.Transactions}.userId`, userIds);
          }
          if (transactionIds) {
            query.whereIn(`${TableName.Transactions}.transactionId`, transactionIds);
          }
          if (droneIds) {
            query.whereIn(`${TableName.Transactions}.droneId`, droneIds);
          }
          if (createdAtLimits.length > 0) {
            query.andWhereBetween(`${TableName.Transactions}.createdAt`, createdAtLimits as any);
          }
          if (periodLimits) {
            query.andWhereBetween(`${TableName.Transactions}.period`, periodLimits);
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

          const select = (
            req as any
          ).swagger.params.select.value as (keyof ITransaction)[];
          const transaction = (
            req as any
          ).swagger.params.transaction.value as ITransactionCreate;

          const dronePriceData = await droneModel.table.columns([
            `${TableName.Drones}.price as price`,
            `${TableName.Drones}.status as droneStatus`,
            `${TableName.Drones}.ownerId as ownerId`,
          ]).where({ droneId: transaction.droneId });
          if (dronePriceData.length === 0) {
            next(new LogicError(ErrorCode.TRANSACTION_DRONE_ID));
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
          const sum = new Decimal(droneInfo.price).mul(transaction.period);
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
              await transactionModel.table.insert({
                ...transaction,
                userId: user.userId,
              }).transacting(trx);
              await userModel.table
                .where({ userId: user.userId })
                .update({
                  cash: dbConnection.knex.raw(`cash + ${sum.toString()}`), // maybe problem
                })
                .transacting(trx);
            } catch (err) {
              trx.rollback(err);
            }
          });
          scheduleDroneUpdate(droneModel, droneInfo.droneId, droneInfo.period * 3600);

          if (select && select.length > 0) {
            res.status(201).json(
              (await transactionModel.table.columns(select)
                  .where({
                    userId: user.userId,
                    droneId: transaction.droneId,
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

          let query;
          if (user.role & UserRoles.OWNER) {
            query = transactionModel.table
              .join(
                TableName.Drones,
                `${TableName.Transactions}.droneId`,
                `${TableName.Drones}.droneId`,
              )
              .where(`${TableName.Drones}.ownerId`, user.userId);
          } else {
            query = transactionModel.table.where('userId', user.userId);
          }

          const dronePriceData = await query.columns([
            ...columns,
            `${TableName.Drones}.ownerId as ownerId`,
          ])
            .where({ transactionId });
          if (dronePriceData.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

          const droneInfo = dronePriceData[0];
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
    };
  }
}

export function restoreRentingSchedule() {
  const db = container.get<DbConnection>(TYPES.DbConnection);
  const droneModel = container.get<DroneModel>(TYPES.DroneModel);

  if (container.get<DbConnection>(TYPES.DbConnection).config.client !== 'mysql') {
    throw new TypeError('Restoring renting queue is not supported for this DB driver (due to SQL dialect)');
  }
  const knex = db.knex;

  const update = (async () => {
    const dronesAlias = TableName.Drones.split('').reverse().join('');
    await knex.schema.raw(`CREATE TEMPORARY TABLE ${knex.raw('??', [dronesAlias])} ${knex(TableName.Drones)
      .columns([
        `${TableName.Drones}.droneId as droneId`,
      ])
      .join(
        TableName.Transactions,
        `${TableName.Drones}.droneId`,
        `${TableName.Transactions}.droneId`,
      )
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
      `${TableName.Drones}.droneId as droneId`,
      knex.raw(
        `${knex.raw('??.??', [TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [TableName.Transactions, 'period'])} * 60 * 60) as ${knex.raw('??', ['timeout'])}`,
      ),
    ])
    .join(
      TableName.Drones,
      `${TableName.Transactions}.droneId`,
      `${TableName.Drones}.droneId`,
    )
    .havingRaw(`${knex.raw('??', ['timeout'])} > NOW()`)
    .then((transactions: { droneId: string, timeout: Date }[]) => {
      for (const { droneId, timeout } of transactions) {
        scheduleDroneUpdate(droneModel, droneId, timeout.getTime() - Date.now());
      }
    });
  return Promise.all([update, select]);
}

function isCustomerOnly(user: IUser) {
  return user.role & UserRoles.CUSTOMER
    && !(user.role & UserRoles.OWNER)
    && !(user.role & UserRoles.ADMIN);
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
