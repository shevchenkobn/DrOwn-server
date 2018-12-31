import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  IUser,
  IUserBase,
  IUserSeed,
  maxPasswordLength,
  UserModel,
  UserRoles,
  WhereClause,
} from '../models/users.model';
import { NextFunction, Request, Response } from 'express';
import { ErrorCode, LogicError } from '../services/error.service';
import { Maybe } from '../@types';
import {
  appendLikeQuery, appendOrderBy, checkLocation,
  getRandomString,
  getSafeSwaggerParam,
  getSortFields, ILocation, mapObject,
} from '../services/util.service';
import { superAdminUserId } from '../services/table-schemas.service';
import { TableName } from '../services/table-names';
import { DbConnection } from '../services/db-connection.class';
import { __await } from 'tslib';

@injectable()
export class UsersController {
  constructor(
    @inject(TYPES.UserModel) userModel: UserModel,
    @inject(TYPES.DbConnection) dbConnection: DbConnection,
  ) {
    return {
      async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as (keyof IUser)[];
          const user = (req as any).user as IUser;

          const columns = getColumns(
            select,
            true,
          );
          if (select && columns.length < select.length) {
            next(new LogicError(ErrorCode.SELECT_BAD));
            return;
          }

          const phoneQuery = getSafeSwaggerParam<string>(req, 'phone-query');
          if (phoneQuery && !(user.role & UserRoles.ADMIN)) {
            next(new LogicError(ErrorCode.USER_FILTER_BAD));
            return;
          }
          const longitudeLimits = getSafeSwaggerParam<[number, number]>(req, 'longitude-limits');
          if (longitudeLimits && !(user.role & UserRoles.ADMIN)) {
            next(new LogicError(ErrorCode.USER_FILTER_BAD));
            return;
          }
          const latitudeLimits = getSafeSwaggerParam<[number, number]>(req, 'latitude-limits');
          if (latitudeLimits && !(user.role & UserRoles.ADMIN)) {
            next(new LogicError(ErrorCode.USER_FILTER_BAD));
            return;
          }

          const userIds = getSafeSwaggerParam<string[]>(req, 'user-ids');
          const emailQuery = getSafeSwaggerParam<string>(req, 'email-query');
          const roles = getSafeSwaggerParam<UserRoles[]>(req, 'roles');
          const nameQuery = getSafeSwaggerParam<string>(req, 'name-query');
          const addressQuery = getSafeSwaggerParam<string>(req, 'address-query');

          const sortings = getSortFields(
            getSafeSwaggerParam<(keyof IUser)[]>(req, 'sort'),
            TableName.Users,
            adminFields,
          );

          const query = userModel.table.columns(columns);

          if (userIds) {
            query.whereIn('userId', userIds);
          }
          if (roles) {
            query.whereIn('role', roles);
          }
          if (nameQuery) {
            appendLikeQuery(dbConnection.knex, query, 'name', nameQuery);
          }
          if (emailQuery) {
            appendLikeQuery(dbConnection.knex, query, 'email', emailQuery);
          }
          if (addressQuery) {
            appendLikeQuery(dbConnection.knex, query, 'address', addressQuery);
          }
          if (phoneQuery) {
            appendLikeQuery(dbConnection.knex, query, 'phoneNumber', phoneQuery);
          }
          if (latitudeLimits) {
            query.andWhereBetween('latitude', latitudeLimits);
          }
          if (longitudeLimits) {
            query.andWhereBetween('longitude', longitudeLimits);
          }
          appendOrderBy(query, sortings);

          console.debug(query.toQuery());
          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async getUser(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const select = (req as any).swagger.params.select.value as (keyof IUser)[];
          const userId = getSafeSwaggerParam<string>(req, 'userId')!;
          if (!(user.role & UserRoles.ADMIN) && user.userId !== userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

          const users = await userModel.select(getColumns(select, true), { userId });
          if (users.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }
          res.json(users[0]);
        } catch (err) {
          next(err);
        }
      },

      async getProfile(req: Request, res: Response) {
        const select = (req as any).swagger.params.select.value as (keyof IUser)[];
        const user = (req as any).user as IUser;

        res.json(mapObject(user, getColumns(select, true)));
      },

      async createUser(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as
            (keyof IUserSeed | keyof IUser)[];
          const inputUser = (req as any).swagger.params.user.value as IUserSeed;
          const user = (req as any).user as IUser;

          const noPassword = !inputUser.password;
          const selectPassword = select && select.includes('password');
          if (noPassword && !(!select || selectPassword)) {
            next(new LogicError(ErrorCode.USER_PASSWORD_SAVE_NO));
            return;
          }
          if (!noPassword && selectPassword) {
            next(new LogicError(ErrorCode.SELECT_BAD));
            return;
          }
          checkLocation(inputUser as ILocation);

          if (!inputUser.password) {
            inputUser.password = getRandomString(maxPasswordLength);
          }

          await userModel.create(inputUser, true);
          const newUser = (await userModel.select(
            getColumns(select as any, true),
            { email: inputUser.email },
          ))[0];
          if (noPassword) {
            newUser.password = inputUser.password;
          }
          res.status(201).json(newUser);
        } catch (err) {
          next(err);
        }
      },

      async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as
            (keyof IUser)[];
          const inputUser = (req as any).swagger.params.user.value as IUserSeed;
          const userId = getSafeSwaggerParam<string>(req, 'userId');
          const email = getSafeSwaggerParam<string>(req, 'email');
          const user = (req as any).user as IUser;

          if (inputUser.role & UserRoles.ADMIN && !(user.role & UserRoles.ADMIN)) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

          const [whereClause, foreignUser] = getUserWhereClause(userId, email, user);

          const hasEmailInWhere = 'email' in whereClause;
          if (inputUser.role && !(inputUser.role & UserRoles.ADMIN)) {
            if (!hasEmailInWhere) {
              if (userId === superAdminUserId) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
            } else {
              const [user] = await userModel.select(['userId'], whereClause);
              if (!user) {
                next(new LogicError(ErrorCode.NOT_FOUND));
                return;
              }
              if (user.userId === superAdminUserId) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
            }
          }

          const passwordUpdated = inputUser.password === '';
          const selectPassword = select && select.length > 0 && select.includes('password' as any);
          if (passwordUpdated) {
            inputUser.password = getRandomString(maxPasswordLength);
            if (!selectPassword) {
              next(new LogicError(ErrorCode.USER_PASSWORD_SAVE_NO));
              return;
            }
          } else if (selectPassword) {
            next(new LogicError(ErrorCode.SELECT_BAD));
            return;
          }

          checkLocation(inputUser as ILocation);

          const affectedRows = await userModel.update(inputUser, whereClause);
          if (affectedRows === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

          if (select && select.length > 0) {
            const newUser = (await userModel.select(
              getColumns(select, true),
              whereClause,
            ))[0];
            if (passwordUpdated) {
              newUser.password = inputUser.password;
            }
            res.json(newUser);
          } else {
            res.json({});
          }
        } catch (err) {
          next(err);
        }
      },

      async deleteUser(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as
            (keyof IUser)[];
          const userId = getSafeSwaggerParam<string>(req, 'userId');
          const email = getSafeSwaggerParam<string>(req, 'email');
          const user = (req as any).user as IUser;

          const [whereClause, foreignUser] = getUserWhereClause(userId, email, user);

          const hasEmailInWhere = 'email' in whereClause;
          if (
            user.role & UserRoles.ADMIN
            && !hasEmailInWhere
            && userId === superAdminUserId
          ) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

          let oldUser: IUser | null = null;
          if (select && select.length > 0) {
            const columns = getColumns(select, true);
            const hadUserIdColumn = hasEmailInWhere && columns.includes('userId');
            if (hasEmailInWhere && !hadUserIdColumn) {
              columns.push('userId');
            }

            if (foreignUser) {
              const users = await userModel.select(columns, whereClause);
              if (users.length === 0) {
                next(new LogicError(ErrorCode.NOT_FOUND));
                return;
              }

              oldUser = users[0];
              if (hasEmailInWhere) {
                if (oldUser!.userId === superAdminUserId) {
                  next(new LogicError(ErrorCode.AUTH_ROLE));
                  return;
                }
                if (!hadUserIdColumn) {
                  delete oldUser!.userId;
                }
              }
            } else {
              if (hasEmailInWhere && user.userId === superAdminUserId) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
              oldUser = mapObject(user, columns) as IUser;
            }
          } else if (hasEmailInWhere && user.role & UserRoles.ADMIN) {
            if (foreignUser) {
              const users = await userModel.select(['userId'], whereClause);
              if (users.length === 0) {
                next(new LogicError(ErrorCode.NOT_FOUND));
                return;
              }
              if (users[0].userId === superAdminUserId) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
            } else if (user.userId  === superAdminUserId) {
              next(new LogicError(ErrorCode.AUTH_ROLE));
              return;
            }
          }

          const affectedRows = await userModel.delete(whereClause);
          if (affectedRows === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

          if (oldUser) {
            res.json(oldUser);
          } else {
            res.json({});
          }
        } catch (err) {
          next(err);
        }
      },
    };
  }
}

const safeColumns: ReadonlyArray<keyof IUser> = [
  'userId',
  'email',
  'role',
  'name',
];
const adminFields: ReadonlyArray<keyof IUser> = [
  'longitude',
  'latitude',
];
export function getColumns(
  columns: Maybe<(keyof IUser)[]>,
  includeAdmin: boolean,
): (keyof IUser)[] {
  if (!columns || columns.length === 0) {
    return (includeAdmin ? safeColumns.concat(adminFields) : safeColumns) as any;
  }
  return columns.filter(
    column => safeColumns.includes(column)
    || includeAdmin && adminFields.includes(column),
  );
}

function getUserWhereClause(userId: Maybe<string>, email: Maybe<string>, user: IUser) {
  if (email && userId) {
    throw new LogicError(ErrorCode.USER_ID_EMAIL);
  }

  let foreignUser = false;
  let whereClause: WhereClause;
  if (userId) {
    foreignUser = user.userId !== userId;
    if (foreignUser && !(user.role & UserRoles.ADMIN)) {
      throw new LogicError(ErrorCode.AUTH_ROLE);
    }
    whereClause = { userId };
  } else if (email) {
    foreignUser = user.email !== email;
    if (foreignUser && !(user.role & UserRoles.ADMIN)) {
      throw new LogicError(ErrorCode.AUTH_ROLE);
    }
    whereClause = { email };
  } else if (!(user.role & UserRoles.ADMIN)) {
    whereClause = { userId: user.userId };
  } else {
    throw new LogicError(ErrorCode.USER_ID_EMAIL);
  }
  return [whereClause, foreignUser] as [WhereClause, boolean];
}
