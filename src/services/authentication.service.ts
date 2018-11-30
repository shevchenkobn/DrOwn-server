// import { TYPES } from '../di/types';
// import { IUser, UserModel } from '../models/users.model';
// import { IncomingMessage } from 'http';
// import { createHash } from 'crypto';
// import * as jwt from 'jsonwebtoken';
// import * as config from 'config';
// import { ErrorCode, LogicError } from './error.service';
// import { AuthController } from './authentication.class';
// import { container } from '../di/container';
//
// const jwtConfig = config.get<JwtConfig>('jwt');
//
// export interface JwtConfig {
//   secret: string;
//   keys: {
//     folder: string;
//     private: string;
//     public: string;
//   };
//   expiration: {
//     access: number | string;
//     refresh: number;
//   };
//   issuer: string;
//   refreshLength: number;
// }
//
// const jwtAuth = container.get<AuthController>(TYPES.AuthService);
// const userModel = container.get<UserModel>(TYPES.UserModel);
//
// export function getUserFromRequest(request: IncomingMessage, ignoreExpiration = false) {
//   return getUserFromToken(getTokenFromRequest(request), ignoreExpiration);
// }
//
// export function getUserFromString(str: string, ignoreExpiration = false) {
//   return getUserFromToken(getTokenFromString(str), ignoreExpiration);
// }
//
// export async function getUserFromToken(token: string, ignoreExpiration = false) {
//   const { id: userId } = jwtAuth.decode(getTokenFromString(token), ignoreExpiration);
//   const users = await userModel.select([], { userId });
//   if (users.length === 0) {
//     throw new LogicError(ErrorCode.AUTH_BAD);
//   }
//   return users[0] as IUser;
// }
//
// export function getTokenFromRequest(request: IncomingMessage) {
//   if (typeof request.headers.authorization !== 'string') {
//     throw new LogicError(ErrorCode.AUTH_NO);
//   }
//   return getTokenFromString(request.headers.authorization);
// }
//
// const bearerRegex = /^Bearer +/;
// export function getTokenFromString(str: string) {
//   if (!bearerRegex.test(str)) {
//     throw new LogicError(ErrorCode.AUTH_NO);
//   }
//   return str.replace(bearerRegex, '');
// }
//
// export function getRefreshToken(user: IUser) {
//   return new Promise<string>((resolve, reject) => {
//     const hasher = createHash('SHA512');
//
//     hasher.once('error', reject);
//     hasher.once('readable', () => {
//       const data = hasher.read() as Buffer;
//       if (!data || data.length === 0) {
//         reject(new TypeError('Hash is empty'));
//         return;
//       }
//       resolve(data.toString('base64'));
//     });
//
//     hasher.write(user.userId + Date.now().toString());
//     hasher.end();
//
//   });
// }
//
// export function getRefreshTokenExpiration(date = new Date()) {
//   return new Date(date.getTime() + jwtConfig.expiration.refresh);
// }
