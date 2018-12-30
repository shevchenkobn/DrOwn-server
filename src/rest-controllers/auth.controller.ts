import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { NextFunction, Request, Response } from 'express';
import { IUser, IUserSeed, UserModel, UserRoles } from '../models/users.model';
import { AuthService } from '../services/authentication.class';
import { ErrorCode, LogicError } from '../services/error.service';
import { compare } from 'bcrypt';
import { getColumns } from './users.controller';

@injectable()
export class AuthController {
  constructor(
    @inject(TYPES.UserModel) userModel: UserModel,
    @inject(TYPES.AuthService) jwt: AuthService,
  ) {
    return {
      async getTokens(req: Request, res: Response, next: NextFunction) {
        try {
          const { email, password } = (req as any).swagger.params.user.value as
            { email: string, password: string };

          const users: IUser[] = await userModel.table.where({
            email,
          }).select();
          if (users.length === 0 || !await compare(password, users[0].passwordHash)) {
            next(new LogicError(ErrorCode.AUTH_BAD));
            return;
          }

          const user = users[0];
          let updateData: {[column: string]: any} = {};
          if (
            !user.refreshToken
            || (
              user.refreshTokenExpiration
              && user.refreshTokenExpiration.getTime() <= Date.now()
            )
          ) {
            updateData = {
              refreshTokenExpiration: jwt.getRefreshTokenExpiration(),
              refreshToken: await jwt.getRefreshToken(user),
            };
            await userModel.table.where({
              userId: user.userId,
            }).update(updateData);
          }
          res.json({
            accessToken: jwt.encode(user),
            refreshToken: updateData.refreshToken || user.refreshToken,
          });
        } catch (err) {
          next(err);
        }
      },

      async refreshTokens(req: Request, res: Response, next: NextFunction) {
        try {
          const { accessToken, refreshToken } = (req as any).swagger.params.tokens.value as
            { accessToken: string, refreshToken: string };

          const user = await jwt.getUserFromToken(accessToken, true);
          if (refreshToken !== user.refreshToken) {
            next(new LogicError(ErrorCode.AUTH_BAD));
            return;
          }

          const now = Date.now();
          if (now >= user.refreshTokenExpiration!.getTime()) {
            await userModel.table.where({ userId: user.userId }).update({
              refreshToken: null,
              refreshTokenExpiration: null,
            });
            next(new LogicError(ErrorCode.AUTH_EXPIRED));
            return;
          }

          // await userModel.table.where({
          //   userId: user.userId,
          // }).update({
          //   refreshTokenExpiration: getRefreshTokenExpiration(),
          // });

          res.json({
            refreshToken,
            accessToken: jwt.encode(user),
          });
        } catch (err) {
          next(err);
        }
      },

      async registerUser(req: Request, res: Response, next: NextFunction) {
        try {
          const inputUser = (req as any).swagger.params.user.value as IUserSeed;
          const select = (req as any).swagger.params.select.value as (keyof IUser)[];
          if (!inputUser.password) {
            next(new LogicError(ErrorCode.USER_PASSWORD_NO));
            return;
          }

          // if (typeof inputUser.companyId === 'string') {
          //   next(new LogicError(ErrorCode.USER_COMPANY_BAD));
          //   return;
          // }

          if (inputUser.role & UserRoles.ADMIN) {
            next(new LogicError(ErrorCode.USER_ROLE_BAD));
            return;
          }
          await userModel.create(inputUser);
          res.status(201).json((await userModel.select(
            getColumns(select, true),
            { email: inputUser.email },
          ))[0]);
        } catch (err) {
          next(err);
        }
      },
    };
  }
}
