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

          if (
            !(user.role & UserRoles.ADMIN)
            && (
              inputUser.role & UserRoles.ADMIN
              || inputUser.role & UserRoles.MODERATOR
            )
          ) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
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

          if (user.role & UserRoles.COMPANY && !(user.role & UserRoles.ADMIN)) {
            if (inputUser.companyId) {
              const companyId = user.userId;
              let users: IUser[] = [inputUser] as IUser[];
              let userId;
              let found = false;
              while (users[0].companyId) {
                userId = users[0].companyId;
                users = (await userModel.select(['role', 'companyId', 'userId'], { userId }));

                if (users.length === 0 || !(users[0].role & UserRoles.COMPANY)) {
                  next(new LogicError(ErrorCode.USER_COMPANY_BAD));
                  return;
                }
                if (users[0].userId === companyId) {
                  found = true;
                  break;
                }
              }
              if (!found) {
                next(new LogicError(ErrorCode.USER_COMPANY_BAD));
                return;
              }
            } else {
              inputUser.companyId = user.userId;
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
