import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { IUser, IUserSeed, UserModel, UserRoles, WhereClause } from '../models/users.model';
import { NextFunction, Request, Response } from 'express';
import { ErrorCode, LogicError } from '../services/error.service';
import { Maybe } from '../../@types/helpers';

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

          inputUser.password = userModel.getPassword(inputUser);
          await userModel.create(inputUser, true);
          const newUser = (await userModel.select(
            getColumns(select as any, true),
            { email: inputUser.email },
          ))[0];
          if (noPassword) {
            newUser.password = inputUser.password;
          }
          res.json(newUser);
        } catch (err) {
          next(err);
        }
      },

      async updateUser(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as
            (keyof IUser)[];
          const inputUser = (req as any).swagger.params.user.value as IUserSeed;
          const userId = (req as any).swagger.params.userId.value as Maybe<string>;
          const email = (req as any).swagger.params.email.value as Maybe<string>;
          const user = (req as any).user as IUser;

          const whereClause = getUserWhereClause(userId, email, user);

          await userModel.update(inputUser, whereClause);
          if (select && select.length > 0) {
            res.json((await userModel.select(
              getColumns(select, true),
              whereClause,
            ))[0]);
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
          const inputUser = (req as any).swagger.params.user.value as IUserSeed;
          const userId = (req as any).swagger.params.userId.value as Maybe<string>;
          const email = (req as any).swagger.params.email.value as Maybe<string>;
          const user = (req as any).user as IUser;

          const whereClause = getUserWhereClause(userId, email, user);

          await userModel.delete(whereClause);
        } catch (err) {
          next(err);
        }
      },
    };
  }
}

const safeColumns: ReadonlyArray<keyof IUser> = [
  'userId',
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

  let whereClause: WhereClause;
  if (userId) {
    whereClause = { userId };
  } else if (email) {
    whereClause = { email };
  } else if (user) {
    whereClause = { userId: user.userId };
  } else {
    throw new LogicError(ErrorCode.USER_EMAIL_AND_ID);
  }
  return whereClause;
}
