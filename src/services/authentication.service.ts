import { TYPES } from '../di/types';
import { IUser } from '../models/users.model';
import { IncomingMessage } from 'http';
import { createHash, randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as config from 'config';
import { LogicError } from '../services/error.service';
import { ErrorCode } from '../services/error.service';
import { container } from '../di/container';
import { UserModel } from '../models/users.model';
import { hash } from 'bcrypt';

const jwtConfig = config.get<{
  secret: string;
  expiration: {
    access: number;
    refresh: number;
  },
  issuer: string;
  refreshLength: 128;
}>('jwt');

export function encodeJwt(user: IUser) {
  return jwt.sign({
    id: user.userId,
  }, jwtConfig.secret, {
    algorithm: 'RS256',
    expiresIn: jwtConfig.expiration.access,
    issuer: jwtConfig.issuer,
  });
}

const userModel = container.get<UserModel>(TYPES.UserModel);
export async function getUserFromRequest(request: IncomingMessage) {
  const { id: userId } = decodeJwt(getTokenFromRequest(request));
  return (await userModel.select([], { userId }))[0] as IUser;
}

export function decodeJwt(token: string): { id: string } {
  return jwt.verify(token, jwtConfig.secret, {
    algorithms: ['RS256'],
    issuer: jwtConfig.issuer,
    ignoreExpiration: false,
  }) as any;
}

const bearerRegex = /^Bearer +/;
export function getTokenFromRequest(request: IncomingMessage) {
  if (
    typeof request.headers.authorization !== 'string'
    || !bearerRegex.test(request.headers.authorization)
  ) {
    throw new LogicError(ErrorCode.AUTH_NO);
  }
  return request.headers.authorization.replace(bearerRegex, '');
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

    hasher.write(user.email + Date.now().toString());
    hasher.end();

  });
}

export function getRefreshTokenExpiration(date = new Date()) {
  return new Date(date.getTime() + jwtConfig.expiration.refresh);
}
