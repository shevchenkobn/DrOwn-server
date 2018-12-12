import { Handler, Request, Response } from 'express';
import { UserRoles, UserStatus } from '../models/users.model';
import { injectable } from 'inversify';
import { enumToObject, IEnum } from '../services/util.service';

@injectable()
export class UserHelpersController {
  constructor() {
    return {
      getUserRoles(req: Request, res: Response) {
        res.json(enumToObject(UserRoles as any));
      },

      getUserStatuses(req: Request, res: Response) {
        res.json(enumToObject(UserStatus as any));
      },
    };
  }
}
