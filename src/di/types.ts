import 'reflect-metadata';

export const ASYNC_INIT = Symbol.for('@asyncInit');

export const TYPES = {
  DbConnection: Symbol.for('DbConnection'),

  AuthService: Symbol.for('AuthService'),

  UserModel: Symbol.for('UserModel'),

  UserHelpersController: Symbol.for('UserHelpersController'),
  AuthController: Symbol.for('AuthController'),
  UsersController: Symbol.for('UsersController'),
};
