import 'reflect-metadata';

export const ASYNC_INIT = Symbol.for('@asyncInit');

export const TYPES = {
  DbConnection: Symbol.for('DbConnection'),

  AuthService: Symbol.for('AuthService'),

  UserModel: Symbol.for('UserModel'),
  DroneModel: Symbol.for('DroneModel'),
  DroneMeasurementModel: Symbol.for('DroneMeasurementModel'),
  DroneOrderModel: Symbol.for('DroneOrderModel'),
  TransactionModel: Symbol.for('TransactionModel'),

  UserHelpersController: Symbol.for('UserHelpersController'),
  AuthController: Symbol.for('AuthController'),
  UsersController: Symbol.for('UsersController'),
  DronesController: Symbol.for('DronesController'),
  DronesMeasurementsController: Symbol.for('DronesMeasurementsController'),
  DroneHelpersController: Symbol.for('DroneHelpersController'),
  DroneOrderController: Symbol.for('DroneOrderController'),
  TransactionController: Symbol.for('TransactionController'),

  SocketIoController: Symbol.for('SocketIoController'),
  // FirebaseController: Symbol.for('FirebaseController'),

  HttpServer: Symbol.for('HttpServer'),
};
