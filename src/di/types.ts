import 'reflect-metadata';

export const ASYNC_INIT = Symbol.for('@asyncInit');

export const TYPES = {
  DbConnection: Symbol.for('DbConnection'),

  JwtAuthorization: Symbol.for('JwtAuthorization'),

  UserModel: Symbol.for('UserModel'),

  UserRolesController: Symbol.for('UserRolesController'),
};
