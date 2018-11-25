import { TYPES } from '../di/types';
import { IUser, UserModel, UserRoles } from '../models/users.model';
import { container } from '../di/container';
import { IResolvers } from 'graphql-tools';
import { compare } from 'bcrypt';
import { ErrorCode, LogicError } from '../services/error.service';
import { encodeJwt, getRefreshToken } from '../services/authentication.service';
import { decodeJwt } from '../services/authentication.service';
import { getSelectColumns } from '../services/util.service';
import { getRefreshTokenExpiration } from '../services/authentication.service';

const userModel = container.get<UserModel>(TYPES.UserModel);

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
      const user: IUser = await userModel.table.where({
        email,
      }).select();
      if (!await compare(password, user.passwordHash)) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }

      const accessToken = encodeJwt(user);

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
        accessToken,
        refreshToken: updateData.refreshToken || user.refreshToken,
      };
    },

    registerUser(_, { userSeed }, ctx, info) {
      // FIXME: check optimized retrieval of specific fields
      return userModel.create(userSeed, true, getSelectColumns(info) as any);
    },

    async getAccessToken(_, { refreshToken, accessToken }) {
      // NOTE: only 2 fields are retrieved, should be changed if auth algos changed
      const dbResult = await userModel.select(
        ['userId', 'refreshTokenExpiration'],
        { refreshToken },
      );
      if (!dbResult || dbResult.length === 0) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }
      const user = dbResult[0] as IUser;
      const { userId, refreshTokenExpiration } = user;

      const now = Date.now();
      if (now >= refreshTokenExpiration!.getTime()) {
        await userModel.table.where({ userId }).update({ refreshToken: null });
        throw new LogicError(ErrorCode.AUTH_EXPIRED);
      }

      let decodedId: string;
      try {
        decodedId = decodeJwt(accessToken).id;
      } catch (err) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }
      if (userId !== decodedId) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }

      await userModel.table.where({
        userId,
      }).update({
        refreshTokenExpiration: getRefreshTokenExpiration(),
      });

      return {
        refreshToken,
        accessToken: encodeJwt(user),
      };
    },
  },
};
