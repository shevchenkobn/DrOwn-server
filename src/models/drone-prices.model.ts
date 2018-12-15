import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import * as Knex from 'knex';
import { TableName } from '../services/table-names';
import { Transaction } from 'knex';

export enum DronePriceActionType {
  SELLING = 1,
  RENTING = 2,
}

export interface IDronePriceInput {
  droneId: string;
  actionType: DronePriceActionType;
  price: string;
}

export interface IDronePrice extends IDronePriceInput{
  priceId: string;
  createdAt: Date;
  isActive: boolean;
}

@injectable()
export class DronePricesModel {
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

  select(columns?: ReadonlyArray<keyof IDronePrice>, where?: any)  {
    const query = where ? this.table.where(where) : this.table;
    return query.select(columns as any);
  }

  update(where: Partial<IDronePrice>, query: Partial<IDronePrice>, transaction?: Transaction) {
    const updateQuery = this.table.where(where).update(query);
    if (transaction) {
      updateQuery.transacting(transaction);
    }
    return updateQuery;
  }
}
