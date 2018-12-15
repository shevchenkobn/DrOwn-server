import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import * as Knex from 'knex';
import { TableName } from '../services/table-names';

export enum DroneRealtimeStatus {
  WAITING = 0,
  TAKING_CARGO = 1,
  MOVING = 2,
}

export interface IDroneMeasurementInput {
  status: DroneRealtimeStatus;
  batteryPower: number;
  longitude: number;
  latitude: number;
  batteryCharge: number;
}

export interface IDroneMeasurement extends IDroneMeasurementInput{
  deviceId: string;
  createdAt: Date;
}

@injectable()
export class DroneMeasurementsModel {
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

  public save(deviceId: string, measurementInput: IDroneMeasurementInput) {
    const measurement = measurementInput as IDroneMeasurement;
    measurement.deviceId = deviceId;
    return this.table.insert(measurement);
  }
}

export function isDroneMeasurementInput(obj: any): obj is IDroneMeasurementInput {
  const isObj = (
    obj instanceof Object && typeof obj.status === 'number' && typeof obj.batteryPower === 'number'
    && typeof obj.longitude === 'number' && typeof obj.latitude === 'number'
    && typeof obj.batteryCharge === 'number'
  );
  return (
    isObj && obj.longitude >= -180 && obj.longitude <= 180
    && obj.latitude >= -90 && obj.latitude <= 90 && !!DroneRealtimeStatus[obj.status]
  );
}
