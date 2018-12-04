import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import * as Knex from 'knex';
import { TableName } from '../services/table-schemas.service';
import { IUser } from './users.model';

export enum DroneStatus {
  UNAUTHORIZED = 0,
  IDLE = 1,
  RENTED = 2,
  OFFLINE = 3,
}

export interface IDroneInput {
  producerId: string;
  ownerId: string;
  deviceId: string;
  status: number;
  baseLongitude?: number;
  baseLatitude?: number;
  batteryPower: number;
  enginePower: number;
  loadCapacity: number;
  canCarryLiquids: boolean;
  isWritingTelemetry: boolean;
}

export interface IDrone extends IDroneInput{
  droneId: string;
  passwordHash: string;
  baseLatitude: number;
  baseLongitude: number;
}

@injectable()
export class DroneModel {
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

  select(columns?: ReadonlyArray<keyof IDrone>, where?: any)  {
    const query = where ? this.table.where(where) : this.table;
    return query.select(columns as any);
  }
}
