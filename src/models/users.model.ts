// import { isUser } from '../services/validators.service';
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import * as Knex from 'knex';
import { hash } from 'bcrypt';
import { TableName } from '../services/table-schemas.service';
import randomatic from 'randomatic';
import { DbConnection } from '../services/db-connection.class';

export const maxPasswordLength = 72 - 29;

export enum UserRoles {
  Customer = 0x1, // Can rent drones and order them
  Owner = 0x2, // Can own, buy, order fixes and sell drones within the app
  Landlord = 0x4, // Can lease drones
  Producer = 0x8, // Can add new drones and edit produced
  Maintainer = 0x10, // Can fix drones
  Company = 0x20, // Can CRUD users-employees and promote them to companies
  Moderator = 0x40, // Can CRUD reviews and reports, fine other users, create users (not moderators)
  Admin = 0x80, // Can CRUD all tables + moderate
}

export interface IUserSeed {
  email: string;
  password?: string | null;
  role: UserRoles;
  name: string;
  companyId?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  cash?: string | null;
}

export interface IUser {
  userId: string;
  email: string;
  passwordHash: string;
  role: UserRoles;
  name: string;
  companyId?: string | null;
  address?: string | null;
  phoneNumber?: string | null;
  cash?: string | null;
  refreshToken?: string | null;
  refreshTokenExpiration?: Date | null;
}

@injectable()
export class UserModel {
  private _connection: DbConnection;
  private _table: Knex.QueryBuilder;

  constructor(
    @inject(TYPES.DbConnection) connection: DbConnection,
  ) {
    this._connection = connection;
    this._table = this._connection.knex(TableName.Users);
  }

  async create(userSeed: IUserSeed, changeSeed = false) {
    const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;

    const user: IUser = {
      email: userSeed.name,
      role: userSeed.role,
      name: userSeed.name,
      companyId: userSeed.companyId,
      address: userSeed.address,
      phoneNumber: userSeed.phoneNumber,
      cash: userSeed.cash,
    } as any;

    if (!editedUserSeed.password) {
      editedUserSeed.password = randomatic('aA0!', maxPasswordLength);
    }
    user.passwordHash = await hash(editedUserSeed.password, 13);
    await this._table.insert(user);
    return editedUserSeed;
  }
}
