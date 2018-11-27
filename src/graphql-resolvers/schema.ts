import { TYPES } from '../di/types';
import { IUser, UserModel, UserRoles } from '../models/users.model';
import { container } from '../di/container';
import { IResolvers } from 'graphql-tools';
import { compare } from 'bcrypt';
import { ErrorCode, LogicError } from '../services/error.service';
import {
  getRefreshToken,
  getRefreshTokenExpiration
} from '../services/authentication.service';
import { getSelectColumns } from '../services/util.service';
import { JwtAuthetication } from '../services/authentication.class';

const userModel = container.get<UserModel>(TYPES.UserModel);
const jwt = container.get<JwtAuthetication>(TYPES.JwtAuthorization);

export const resolvers: IResolvers = {
  Query: {
    userRoles() {
      return UserRoles;
    },
    users(_, args, ctx, info) {
      // FIXME: check optimized retrieval of specific fields
      return userModel.select(getSelectColumns(info) as any);
    },
  },

  Mutation: {
    async authenticate(_, { email, password }) {
      const users: IUser[] = await userModel.table.where({
        email,
      }).select();
      if (users.length === 0 || !await compare(password, users[0].passwordHash)) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }
      const user = users[0];

      const updateData: {[column: string]: any} = {
        refreshTokenExpiration: getRefreshTokenExpiration(),
      };
      if (!user.refreshToken) {
        updateData.refreshToken = await getRefreshToken(user);
      }
      await userModel.table.where({
        userId: user.userId,
      }).update(updateData);

      return {
        accessToken: jwt.encode(user),
        refreshToken: updateData.refreshToken || user.refreshToken,
      };
    },

    registerUser(_, { userSeed }, ctx, info) {
      // FIXME: check optimized retrieval of specific fields
      return userModel.create(userSeed, true, getSelectColumns(info) as any);
    },

    async getAccessToken(_, { refreshToken, accessToken }, ctx) {
      // NOTE: only 2 fields are retrieved, should be changed if auth algos changed
      if (refreshToken !== ctx.user.refreshToken) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }

      const now = Date.now();
      if (now >= ctx.user.refreshTokenExpiration!.getTime()) {
        await userModel.table.where({ userId: ctx.user.userId }).update({
          refreshToken: null,
          refreshTokenExpiration: null,
        });
        throw new LogicError(ErrorCode.AUTH_EXPIRED);
      }

      await userModel.table.where({
        userId: ctx.user.userId,
      }).update({
        refreshTokenExpiration: getRefreshTokenExpiration(),
      });

      return {
        refreshToken,
        accessToken: jwt.encode(ctx.user),
      };
    },
  },
};
