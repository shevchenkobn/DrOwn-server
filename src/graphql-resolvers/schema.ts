import { TYPES } from '../di/types';
import { IUser, UserModel, UserRoles } from '../models/users.model';
import { container } from '../di/container';
import { IResolvers } from 'graphql-tools';
import { compare } from 'bcrypt';
import { ErrorCode, LogicError } from '../services/error.service';
import * as jwt from 'jsonwebtoken';
import * as config from 'config';
import { encodeJwt, getRefreshToken } from '../services/authentication.service';

const userModel = container.get<UserModel>(TYPES.UserModel);
const jwtConfig = config.get<{
  secret: string;
  expiration: {
    access: number;
    refresh: number;
  },
  issuer: string;
}>('jwt');

export const resolvers: IResolvers = {
  Query: {
    userRoles() {
      return UserRoles;
    },
    async users(_, args) {
      return userModel.select(); // FIXME: optimize retrieval of specific fields
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
        refreshTokenExpiration: new Date(Date.now() + jwtConfig.expiration.refresh),
      };
      if (!user.refreshToken) {
        updateData.refreshToken = await getRefreshToken();
      }
      await userModel.table.where({
        userId: user.userId,
      }).update(updateData);

      return {
        accessToken,
        refreshToken: updateData.refreshToken || user.refreshToken,
      };
    },

    registerUser(_, { userSeed }) {
      return userModel.create(userSeed); // FIXME: optimize retrieval of specific fields
    },
  },
};
