// import { isUser } from '../services/validators.service';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import * as Knex from 'knex';
import { hash } from 'bcrypt';
import { TableName } from '../services/table-schemas.service';
import * as randomatic from 'randomatic';
import { DbConnection } from '../services/db-connection.class';
import { ErrorCode, LogicError } from '../services/error.service';

export const maxPasswordLength = 72 - 29;

export enum UserRoles {
  CUSTOMER = 0x1, // Can rent drones and order them
  OWNER = 0x2, // Can own, buy, order fixes and sell drones within the app
  LANDLORD = 0x4, // Can lease drones
  PRODUCER = 0x8, // Can add new drones and edit produced
  ADMIN = 0x10, // Can CRUD all tables + moderate
}

export enum UserStatus {
  ACTIVE = 1,
  BLOCKED = 2,
}

export function isValidRole(role: any): role is UserRoles {
  return typeof role === 'number' && role >= UserRoles.CUSTOMER && role <= UserRoles.ADMIN;
}

export interface IUserBase {
  email: string;
  role: UserRoles;
  name: string;
  status?: UserStatus | null;
  address?: string | null;
  phoneNumber?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  cash?: string | null;
}

export interface IUserSeed extends IUserBase {
  password?: string | null;
}

export interface IUser extends IUserBase {
  userId: string;
  passwordHash: string;
  refreshToken?: string | null;
  refreshTokenExpiration?: Date | null;
}

@injectable()
export class UserModel {
  private readonly _connection: DbConnection;
  private readonly _knex: Knex;

  public get table() {
    return this._knex(TableName.Users);
  }

  constructor(
    @inject(TYPES.DbConnection) connection: DbConnection,
  ) {
    this._connection = connection;
    this._knex = this._connection.knex;
  }

  select(columns?: ReadonlyArray<keyof IUser>, where?: any) {
    const query = where ? this.table.where(where) : this.table;
    return query.select(columns as any);
  }

  getPassword(userSeed: IUserSeed) {
    return !userSeed.password
      ? randomatic('aA0!', maxPasswordLength)
      : userSeed.password;
  }

  async create(userSeed: IUserSeed, changeSeed = false) {
    const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;

    const user: IUser = {
      email: userSeed.email,
      role: userSeed.role,
      status: UserStatus.ACTIVE,
      name: userSeed.name,
      address: userSeed.address,
      longitude: userSeed.longitude,
      latitude: userSeed.latitude,
      phoneNumber: userSeed.phoneNumber,
      cash: userSeed.cash,
    } as any;

    user.passwordHash = await hash(editedUserSeed.password, 13);
    try {
      await this.table.insert(user);
    } catch (err) {
      switch (err.errno) {
        case 1062:
          throw new LogicError(ErrorCode.USER_DUPLICATE_EMAIL);

        case 1452:
          throw new LogicError(ErrorCode.USER_COMPANY_NO);
      }

      console.log('register user: ', err);
      throw new LogicError(ErrorCode.SERVER);
    }
  }
}
