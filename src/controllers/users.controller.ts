import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { IUser, IUserSeed, UserModel, UserRoles, WhereClause } from '../models/users.model';
import { NextFunction, Request, Response } from 'express';
import { ErrorCode, LogicError } from '../services/error.service';
import { Maybe } from '../@types';
import { getSafeSwaggerParam } from '../services/util.service';

@injectable()
export class UsersController {
  constructor(
    @inject(TYPES.UserModel) userModel: UserModel,
  ) {
    return {
      async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as (keyof IUser)[];
          const user = (req as any).user as IUser;

          const columns = getColumns(
            select,
            !!(user.role & UserRoles.ADMIN),
          );
          if (select && columns.length < select.length) {
            next(new LogicError(ErrorCode.SELECT_BAD));
            return;
          }
          // TODO: add filters and sorting
          res.json(await userModel.select(columns));
        } catch (err) {
          next(err);
        }
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
            next(new LogicError(ErrorCode.USER_NO_SAVE_PASSWORD));
            return;
          }
          if (!noPassword && selectPassword) {
            next(new LogicError(ErrorCode.SELECT_BAD));
            return;
          }

          if (!inputUser.password) {
            inputUser.password = userModel.getPassword();
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

          const [whereClause] = getUserWhereClause(userId, email, user);

          const passwordUpdated = inputUser.password === '';
          const selectPassword = select && select.length > 0 && select.includes('password' as any);
          if (passwordUpdated) {
            inputUser.password = userModel.getPassword();
            if (!selectPassword) {
              next(new LogicError(ErrorCode.USER_NO_SAVE_PASSWORD));
              return;
            }
          } else if (selectPassword) {
            next(new LogicError(ErrorCode.SELECT_BAD));
            return;
          }

          if (inputUser.role & UserRoles.ADMIN && !(user.role & UserRoles.ADMIN)) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

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

          let oldUser: IUser | null = null;
          if (select && select.length > 0) {
            const columns = getColumns(select, true);
            oldUser = foreignUser
              ? (await userModel.select(columns, whereClause))[0]
              : Object.keys(user).reduce((mapped, c) => {
                if (columns.includes(c as any)) {
                  mapped[c] = (user as any)[c];
                }
                return mapped;
              }, {} as { [field: string]: any });
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
  'status',
];
const adminFields: ReadonlyArray<keyof IUser> = [
  'phoneNumber',
  'cash',
  'address',
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
    throw new LogicError(ErrorCode.USER_EMAIL_AND_ID);
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
    throw new LogicError(ErrorCode.USER_EMAIL_AND_ID);
  }
  return [whereClause, foreignUser] as [WhereClause, boolean];
}
