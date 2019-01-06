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
}

export enum DroneOrderStatus {
  STARTED = 0,
  ERROR = 1,
  ENQUEUED = 2,
  SKIPPED = 3,
  DONE = 4,
  TOO_FAR_GEO = 5,
  HAS_LOAD = 6,
  HAS_NO_LOAD = 7,
}

export interface IDroneOrderInput {
  deviceId: string;
  action: DroneOrderAction;
  longitude?: number;
  latitude?: number;
}

export interface IDroneOrder extends IDroneOrderInput {
  droneOrderId: string;
  status?: DroneOrderStatus;
}

@injectable()
export class DroneOrdersModel {
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

  select(columns?: ReadonlyArray<keyof IDroneOrder>, where?: any)  {
    const query = where ? this.table.where(where) : this.table;
    return query.select(columns as any);
  }
}

export function isOrderStatus(value: any): value is DroneOrderStatus {
  return typeof value === 'number' && !!DroneOrderStatus[value];
}

const orderIdRegex = /^\d{1,19}$/
export function isOrderId(value: any): value is string {
  return typeof value === 'string' && orderIdRegex.test(value);
}
