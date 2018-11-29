import { ASYNC_INIT, TYPES } from '../di/types';
import { IUser, UserModel } from '../models/users.model';
import { IncomingMessage } from 'http';
import {
  createHash,
  randomBytes,
} from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as config from 'config';
import { LogicError, ErrorCode } from './error.service';
import { JwtAuthetication } from './authentication.class';
import { container } from '../di/container';
import { getKeyPaths, KeyPaths, Keys, loadKeys } from './key.service';
import { injectable } from 'inversify';

const jwtConfig = config.get<JwtConfig>('jwt');

export interface JwtConfig {
  secret: string;
  keys: {
    folder: string;
    private: string;
    public: string;
  };
  expiration: {
    access: number | string;
    refresh: number;
  };
  issuer: string;
  refreshLength: number;
}

const jwtAuth = container.get<JwtAuthetication>(TYPES.JwtAuthorization);
const userModel = container.get<UserModel>(TYPES.UserModel);

export async function getUserFromString(str: string) {
  const { id: userId } = jwtAuth.decode(getTokenFromString(str));
  return (await userModel.select([], { userId }))[0] as IUser;
}

export function getTokenFromRequest(request: IncomingMessage) {
  if (typeof request.headers.authorization !== 'string') {
    throw new LogicError(ErrorCode.AUTH_NO);
  }
  return getTokenFromString(request.headers.authorization);
}

const bearerRegex = /^Bearer +/;
export function getTokenFromString(str: string) {
  if (!bearerRegex.test(str)) {
    throw new LogicError(ErrorCode.AUTH_NO);
  }
  return str.replace(bearerRegex, '');
}

export function getRefreshToken(user: IUser) {
  return new Promise<string>((resolve, reject) => {
    const hasher = createHash('SHA512');

    hasher.once('error', reject);
    hasher.once('readable', () => {
      const data = hasher.read() as Buffer;
      if (!data || data.length === 0) {
        reject(new TypeError('Hash is empty'));
        return;
      }
      resolve(data.toString('base64'));
    });

    hasher.write(user.userId + Date.now().toString());
    hasher.end();

  });
}

export function getRefreshTokenExpiration(date = new Date()) {
  return new Date(date.getTime() + jwtConfig.expiration.refresh);
}
