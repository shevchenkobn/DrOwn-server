import 'reflect-metadata';

export const ASYNC_INIT = Symbol.for('@asyncInit');

export const TYPES = {
  DbConnection: Symbol.for('DbConnection'),

  AuthService: Symbol.for('AuthService'),

  UserModel: Symbol.for('UserModel'),
  DroneModel: Symbol.for('DroneModel'),

  UserHelpersController: Symbol.for('UserHelpersController'),
  AuthController: Symbol.for('AuthController'),
  UsersController: Symbol.for('UsersController'),
  DronesController: Symbol.for('DronesController'),
};
