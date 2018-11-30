// import { isUser } from '../services/validators.service';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import * as Knex from 'knex';
import { hash } from 'bcrypt';
import { TableName } from '../services/table-schemas.service';
import randomatic from 'randomatic';
import { DbConnection } from '../services/db-connection.class';
import { LogicError } from '../services/error.service';
import { ErrorCode } from '../services/error.service';

export const maxPasswordLength = 72 - 29;

export enum UserRoles {
  CUSTOMER = 0x1, // Can rent drones and order them
  OWNER = 0x2, // Can own, buy, order fixes and sell drones within the app
  LANDLORD = 0x4, // Can lease drones
  PRODUCER = 0x8, // Can add new drones and edit produced
  MAINTAINER = 0x10, // Can fix drones
  COMPANY = 0x20, // Can CRUD users-employees and promote them to companies
  MODERATOR = 0x40, // Can CRUD reviews and reports, fine other users, create users (not moderators)
  ADMIN = 0x80, // Can CRUD all tables + moderate
}

export function isValidRole(role: any): role is UserRoles {
  return typeof role === 'number' && role >= UserRoles.CUSTOMER && role <= UserRoles.ADMIN;
}

export interface IUserBase {
  email: string;
  role: UserRoles;
  name: string;
  companyId?: string | null;
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

const safeColumns = [
  'userId',
  'role',
  'name',
  'companyId',
  'address',
  'phoneNumber',
  'longitude',
  'latitude',
  'cash',
];
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

  select(columns?: (keyof IUser)[], where?: any, safeSelect = true) {
    let fields: string[] = columns as string[];
    if (!columns) {
      fields = safeSelect ? safeColumns : [];
    }

    const query = where ? this.table.where(where) : this.table;
    return query.select(fields);
  }

  async create(userSeed: IUserSeed, changeSeed = false, selectColumns?: (keyof IUser)[]) {
    const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;

    const user: IUser = {
      email: userSeed.email,
      role: userSeed.role,
      name: userSeed.name,
      companyId: userSeed.companyId,
      address: userSeed.address,
      phoneNumber: userSeed.phoneNumber,
      cash: userSeed.cash,
    } as any;

    if (!editedUserSeed.password) {
      if (!editedUserSeed.companyId) {
        throw new LogicError(ErrorCode.USER_COMPANY_NO);
      }
      editedUserSeed.password = randomatic('aA0!', maxPasswordLength);
    }
    user.passwordHash = await hash(editedUserSeed.password, 13);
    try {
      await this.table.insert(user);
    } catch (err) {
      // FIXME: throw  duplicate name or some other error if some connection problems
      throw new LogicError(ErrorCode.USER_DUPLICATE_EMAIL);
    }
    const selectedUser = (await this.select(
      selectColumns,
      { email: editedUserSeed.email }))[0] as IUser;
    return selectedUser;
  }
}
