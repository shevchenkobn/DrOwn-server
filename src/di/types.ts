import 'reflect-metadata';

export const ASYNC_INIT = Symbol.for('@asyncInit');

export const TYPES = {
  DbConnection: Symbol.for('DbConnection'),

  AuthService: Symbol.for('AuthService'),

  UserModel: Symbol.for('UserModel'),

  UserRolesController: Symbol.for('UserRolesController'),
  AuthController: Symbol.for('AuthController'),
  UsersController: Symbol.for('UsersController'),
};
