import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { UserModel, IUser } from '../models/users.model';
import { Request, Response, NextFunction } from 'express';

@injectable()
export class UsersController {
  constructor(
    @inject(TYPES.UserModel) userModel: UserModel,
  ) {
    return {
      async getUsers(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (req as any).swagger.params.select.value as (keyof IUser)[];
          // TODO: disallow non-admin and non-moderators
          //       from seeing longitude, address, latitude and cash
          // TODO: add filters and sorting
          res.json(await userModel.select(select));
        } catch (err) {
          next(err);
        }
      },
    };
  }
}
