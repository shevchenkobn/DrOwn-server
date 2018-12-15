import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import * as Knex from 'knex';
import { hash } from 'bcrypt';
import { TableName } from '../services/table-names';
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

export type WhereClause = { email: string } | { userId: string };

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

  select(columns?: ReadonlyArray<keyof IUser>, where?: any)  {
    const query = where ? this.table.where(where) : this.table;
    return query.select(columns as any);
  }

  async create(userSeed: IUserSeed, changeSeed = false) {
    const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;

    const { password, ...user } = userSeed as (IUser & IUserSeed);

    user.passwordHash = await hash(editedUserSeed.password, 13);
    try {
      return await this.table.insert(user);
    } catch (err) {
      handleChangeError(err);
    }
  }

  async update(
    userSeed: Partial<IUserSeed>,
    whereClause: WhereClause,
    changeSeed = false,
  ) {
    const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;

    const { password, ...user } = userSeed as (IUser & IUserSeed);

    if (password) {
      user.passwordHash = await hash(editedUserSeed.password, 13);
    }
    try {
      return await this.table.where(whereClause).update(user);
    } catch (err) {
      handleChangeError(err);
    }
  }

  async delete(whereClause: WhereClause) {
    return this.table.where(whereClause).delete();
  }
}

function handleChangeError(err: any): never {
  switch (err.errno) {
    case 1062:
      throw new LogicError(ErrorCode.USER_EMAIL_DUPLICATE);

    case 1051:
      throw new LogicError(ErrorCode.USER_HAS_DRONES);
  }

  console.log('change user error: ', err);
  throw new LogicError(ErrorCode.SERVER);
}
