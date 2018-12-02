import { Handler, Request, Response } from 'express';
import { UserRoles, UserStatus } from '../models/users.model';
import { injectable } from 'inversify';

@injectable()
export class UserHelpersController {
  constructor() {
    return {
      getUserRoles(req: Request, res: Response) {
        res.json(Object.keys(UserRoles).reduce((values, key) => {
          if (!Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
            return values;
          }
          values[key.toLowerCase()] = UserRoles[key as any] as any;
          return values;
        }, {} as {[role: string]: number}));
      },

      getUserStatuses(req: Request, res: Response) {
        res.json(Object.keys(UserStatus).reduce((values, key) => {
          if (!Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
            return values;
          }
          values[key.toLowerCase()] = UserStatus[key as any] as any;
          return values;
        }, {} as {[role: string]: number}));
      },
    };
  }
}
