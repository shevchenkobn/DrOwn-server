import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { UserModel, IUser, UserRoles } from '../models/users.model';
import { Request, Response, NextFunction } from 'express';

const invisibleFields = ['cash', 'address', 'longitude', 'latitude'];
@injectable()
export class UsersController {
  constructor(
    @inject(TYPES.UserModel) userModel: UserModel,
  ) {
    return {
      async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
          let select = (req as any).swagger.params.select.value as (keyof IUser)[];
          const user = (req as any).user as IUser;
          if (!(
            user.role & UserRoles.ADMIN
            || user.role & UserRoles.MODERATOR
          )) {
            select = select.filter(column => !invisibleFields.includes(column));
          }
          console.debug(select);
          // TODO: add filters and sorting
          res.json(await userModel.select(select));
        } catch (err) {
          next(err);
        }
      },
    };
  }
}
