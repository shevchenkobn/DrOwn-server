import { ASYNC_INIT, TYPES } from './types';
import { Container } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import { UserModel } from '../models/users.model';
import { AuthService } from '../services/authentication.class';
import { UserHelpersController } from '../rest-controllers/user-helpers.controller';
import { UsersController } from '../rest-controllers/users.controller';
import { AuthController } from '../rest-controllers/auth.controller';
import { DroneModel } from '../models/drones.model';
import { DronesController } from '../rest-controllers/drones.controller';
import { DroneHelpersController } from '../rest-controllers/drone-helpers.controller';
import { SocketIoController } from '../controllers/socket-io.controller';
import { DroneMeasurementsModel } from '../models/drone-measurements.model';
import { DroneOrdersController } from '../rest-controllers/drone-orders.controller';
import { DroneOrdersModel } from '../models/drone-orders.model';
import { DroneMeasurementsController } from '../rest-controllers/drone-measurements.controller';

export const container = new Container({
  defaultScope: 'Singleton',
});

const typeMap = new Map<symbol, any>([
  [TYPES.DbConnection, DbConnection],

  [TYPES.AuthService, AuthService],

  [TYPES.UserModel, UserModel],
  [TYPES.DroneModel, DroneModel],
  [TYPES.DroneMeasurementModel, DroneMeasurementsModel],
  [TYPES.DroneOrderModel, DroneOrdersModel],

  [TYPES.UserHelpersController, UserHelpersController],
  [TYPES.AuthController, AuthController],
  [TYPES.UsersController, UsersController],
  [TYPES.DronesController, DronesController],
  [TYPES.DronesMeasurementsController, DroneMeasurementsController],
  [TYPES.DroneHelpersController, DroneHelpersController],
  [TYPES.DroneOrderController, DroneOrdersController],

  [TYPES.SocketIoController, SocketIoController],
]);

for (const [symbol, type] of typeMap) {
  container.bind<any>(symbol).to(type);
}

let initPromise: Promise<any[]> | null = null;
export function initAsync() {
  if (initPromise) {
    return initPromise;
  }
  initPromise = Promise.all(
    [...typeMap.entries()]
      .filter(([, type]) => ASYNC_INIT in type)
      .map(([symbol]) => container.get<any>(symbol)[ASYNC_INIT] as Promise<any>),
  );
  return initPromise;
}
