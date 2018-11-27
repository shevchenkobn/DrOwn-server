import 'reflect-metadata';

export const ASYNC_INIT = Symbol.for('@asyncInit');

export const TYPES = {
  DbConnection: Symbol.for('DbConnection'),
  UserModel: Symbol.for('UserModel'),
  JwtAuthorization: Symbol.for('JwtAuthorization'),

};
