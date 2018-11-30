import * as config from 'config';
import { inject, injectable } from 'inversify';
import { ASYNC_INIT, TYPES } from '../di/types';
import { getKeyPaths, Keys, loadKeys } from './key.service';
import { IUser, UserModel } from '../models/users.model';
import * as jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { ErrorCode, LogicError } from './error.service';
import { IncomingMessage } from 'http';

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

const bearerRegex = /^Bearer +/;

@injectable()
export class AuthService {
  public readonly [ASYNC_INIT]: Promise<void>;
  public static readonly [ASYNC_INIT] = true;
  private _keys?: Keys;
  private _userModel: UserModel;

  constructor(
    @inject(TYPES.UserModel) userModel: UserModel,
    keyPaths = getKeyPaths(),
  ) {
    this[ASYNC_INIT] = loadKeys(keyPaths).then(keys => {
      this._keys = keys;
    });
    this._userModel = userModel;
  }

  encode(user: IUser) {
    return jwt.sign({
      id: user.userId,
    }, this._keys!.privateKey, {
      algorithm: 'RS256',
      expiresIn: jwtConfig.expiration.access,
      issuer: jwtConfig.issuer,
    });
  }

  decode(token: string, ignoreExpiration = false): { id: string } {
    const payload = jwt.verify(token, this._keys!.publicKey, {
      ignoreExpiration,
      algorithms: ['RS256'],
      issuer: jwtConfig.issuer,
    }) as any;
    return payload;
  }

  getUserFromRequest(request: IncomingMessage, ignoreExpiration = false) {
    return this.getUserFromToken(this.getTokenFromRequest(request), ignoreExpiration);
  }

  getUserFromString(str: string, ignoreExpiration = false) {
    return this.getUserFromToken(this.getTokenFromString(str), ignoreExpiration);
  }

  async getUserFromToken(token: string, ignoreExpiration = false) {
    const { id: userId } = this.decode(token, ignoreExpiration);
    const users = await this._userModel.select([], { userId });
    if (users.length === 0) {
      throw new LogicError(ErrorCode.AUTH_BAD);
    }
    return users[0] as IUser;
  }

  getTokenFromRequest(request: IncomingMessage) {
    if (typeof request.headers.authorization !== 'string') {
      throw new LogicError(ErrorCode.AUTH_NO);
    }
    return this.getTokenFromString(request.headers.authorization);
  }

  getTokenFromString(str: string) {
    if (!bearerRegex.test(str)) {
      throw new LogicError(ErrorCode.AUTH_NO);
    }
    return str.replace(bearerRegex, '');
  }

  getRefreshToken(user: IUser) {
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

  getRefreshTokenExpiration(date = new Date()) {
    return new Date(date.getTime() + jwtConfig.expiration.refresh);
  }
}
