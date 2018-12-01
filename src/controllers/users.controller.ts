import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { IUser, IUserSeed, UserModel, UserRoles } from '../models/users.model';
import { NextFunction, Request, Response } from 'express';
import { ErrorCode, LogicError } from '../services/error.service';

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
            !!(user.role & UserRoles.ADMIN
              || user.role & UserRoles.MODERATOR),
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

          if (user.role & UserRoles.COMPANY && !(user.role & UserRoles.ADMIN)) {
            if (inputUser.role & UserRoles.ADMIN || inputUser.role & UserRoles.MODERATOR) {
              next(new LogicError(ErrorCode.AUTH_ROLE));
              return;
            }
            if (inputUser.companyId && inputUser.companyId !== user.userId) {
              next(new LogicError(ErrorCode.USER_COMPANY_HAS));
              return;
            }
            inputUser.companyId = user.userId;
          }

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

          if (user.role & UserRoles.ADMIN) {
            let users = [inputUser];
            let userId;
            while (users[0].companyId) {
              userId = inputUser.companyId;
              users = await userModel.select(['role', 'companyId'], { userId });

              if (!(users[0].role & UserRoles.COMPANY)) {
                next(new LogicError(ErrorCode.USER_COMPANY_NO));
                return;
              }
            }
          }

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
    };
  }
}

const safeColumns: ReadonlyArray<keyof IUser> = [
  'userId',
  'role',
  'name',
  'companyId',
];
const adminFields: ReadonlyArray<keyof IUser> = [
  'phoneNumber',
  'cash',
  'address',
  'longitude',
  'latitude',
];
export function getColumns(
  columns?: (keyof IUser)[] | null,
  includeAdmin = false,
): (keyof IUser)[] {
  if (!columns || columns.length === 0) {
    return (includeAdmin ? safeColumns.concat(adminFields) : safeColumns) as any;
  }
  return columns.filter(
    column => safeColumns.includes(column)
    || includeAdmin && adminFields.includes(column),
  );
}
