import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import * as Knex from 'knex';
import { TableName } from '../services/table-schemas.service';

export enum TransactionStatus {
  PENDING = 0,
  CONFIRMED = 1,
  REJECTED = 2,
}

export interface ITransactionCreate {
  priceId: string;
  period?: number;
}

export interface ITransaction extends ITransactionCreate {
  transactionId: string;
  createdAt: Date;
  userId: string;
  status: TransactionStatus;
}

@injectable()
export class TransactionsModel {
  private readonly _connection: DbConnection;
  private readonly _knex: Knex;

  public get table() {
    return this._knex(TableName.Drones);
  }

  constructor(
    @inject(TYPES.DbConnection) connection: DbConnection,
  ) {
    this._connection = connection;
    this._knex = this._connection.knex;
  }
}
