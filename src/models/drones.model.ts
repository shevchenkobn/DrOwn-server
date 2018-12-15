import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import * as Knex from 'knex';
import { TableName } from '../services/table-names';
import { ErrorCode, LogicError } from '../services/error.service';
import { compare, hash } from 'bcrypt';

export const maxPasswordLength = 72 - 29;

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
  baseLongitude?: number | null;
  baseLatitude?: number | null;
  batteryPower: number;
  enginePower: number;
  loadCapacity: number;
  canCarryLiquids: boolean;
  passwordHash: string;
}

export interface IDrone extends IDroneInput{
  droneId: string;
  passwordHash: string;
  baseLatitude: number;
  baseLongitude: number;
}

export type WhereClause = { droneId: string } | { deviceId: string };

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

  async create(drone: IDroneInput) {
    try {
      return await this.table.insert(drone);
    } catch (err) {
      handleChangeError(err);
    }
  }

  async update(drone: Partial<IDroneInput>, whereClause: WhereClause) {
    try {
      return await this.table.where(whereClause).update(drone);
    } catch (err) {
      handleChangeError(err);
    }
  }

  delete(whereClause: WhereClause) {
    return this.table.where(whereClause).delete();
  }

  async authorize(whereClause: WhereClause, password: string) {
    if (password.length > maxPasswordLength) {
      throw new Error('Password is too long');
    }
    const passwordHash = await hash(password, 13);
    return await this.update({
      passwordHash,
      status: DroneStatus.OFFLINE,
    } as any, whereClause);
  }

  async authenticateDrone(
    deviceId: string,
    password: string,
    columns?: ReadonlyArray<keyof IDrone>,
  ) {
    const hadPassword = !columns || columns.length === 0 || columns.includes('passwordHash');
    const select: (keyof IDrone)[] = !columns || columns.length === 0 ? [] : columns.slice();
    if (!hadPassword) {
      select.push('passwordHash');
    }
    const drones = await this.select(select, { deviceId });
    if (drones.length === 0 || !await compare(password, drones[0].passwordHash)) {
      throw new LogicError(ErrorCode.AUTH_BAD);
    }
    if (!hadPassword) {
      select.pop();
      delete drones[0].passwordHash;
    }
    return drones[0];
  }
}

function handleChangeError(err: any): never {
  switch (err.errno) {
    case 1062:
      // TODO: investigate if caught correctly
      throw new LogicError(ErrorCode.DRONE_DEVICE_ID_BAD);

    case 1452:
      // TODO: investigate if caught correctly
      if (err.message.includes('ownerId')) {
        throw new LogicError(ErrorCode.DRONE_OWNER_BAD);
      } else if (err.message.includes('producerId')) {
        throw new LogicError(ErrorCode.DRONE_PRODUCER_BAD);
      }
  }

  console.log('change user error: ', err);
  throw new LogicError(ErrorCode.SERVER);
}
