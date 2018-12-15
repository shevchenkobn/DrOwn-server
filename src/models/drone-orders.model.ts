import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import * as Knex from 'knex';
import { TableName } from '../services/table-names';

export enum DroneOrderAction {
  STOP_AND_WAIT = 0,
  MOVE_TO_LOCATION = 1,
  TAKE_CARGO = 2,
  RELEASE_CARGO = 3,

  DELIVER = 4,
}

export interface IDroneOrder {
  deviceId: string;
  userId: string;
  action: DroneOrderAction;
  longitude?: number;
  latitude?: number;
}

@injectable()
export class DroneMeasurementsModel {
  private readonly _connection: DbConnection;
  private readonly _knex: Knex;

  public get table() {
    return this._knex(TableName.DroneOrders);
  }

  constructor(
    @inject(TYPES.DbConnection) connection: DbConnection,
  ) {
    this._connection = connection;
    this._knex = this._connection.knex;
  }
}
