import { IUser } from '../models/users.model';
import { randomBytes } from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as config from 'config';

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
    expiresIn: jwtConfig.expiration.refresh,
    issuer: jwtConfig.issuer,
  });
}

export function verifyJwt(token: string) {
  return jwt.verify(token, jwtConfig.secret, {
    algorithms: ['RS256'],
    issuer: jwtConfig.issuer,
    ignoreExpiration: false,
  });
}

export function getTokenFromRequest(request: any) {
  // TODO:
  throw new Error('not implemented');
}

export function getRefreshToken() {
  return new Promise<string>((resolve, reject) => {
    randomBytes(jwtConfig.refreshLength, (err, buf) => {
      if (err) {
        reject(err);
      }

      resolve(buf.toString('base64'));
    });
  });
}
