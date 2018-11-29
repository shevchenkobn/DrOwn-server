import * as config from 'config';
import { JwtConfig } from './authentication.service';
import { injectable } from 'inversify';
import { ASYNC_INIT } from '../di/types';
import { getKeyPaths, Keys, loadKeys } from './key.service';
import { IUser } from '../models/users.model';
import * as jwt from 'jsonwebtoken';

const jwtConfig = config.get<JwtConfig>('jwt');

@injectable()
export class JwtAuthetication {
  public readonly [ASYNC_INIT]: Promise<void>;
  private _keys?: Keys;

  constructor(keyPaths = getKeyPaths()) {
    this[ASYNC_INIT] = loadKeys(keyPaths).then(keys => {
      this._keys = keys;
    });
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
}
