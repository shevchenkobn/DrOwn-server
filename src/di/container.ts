import { ASYNC_INIT, TYPES } from './types';
import { Container } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import { UserModel } from '../models/users.model';
import { AuthService } from '../services/authentication.class';
import { UserHelpersController } from '../controllers/user-helpers.controller';
import { UsersController } from '../controllers/users.controller';
import { AuthController } from '../controllers/auth.controller';
import { DroneModel } from '../models/drones.model';
import { DronesController } from '../controllers/drones.controller';
import { DroneHelpersController } from '../controllers/drone-helpers.controller';

export const container = new Container({
  defaultScope: 'Singleton',
});

const typeMap = new Map<symbol, any>([
  [TYPES.DbConnection, DbConnection],

  [TYPES.AuthService, AuthService],

  [TYPES.UserModel, UserModel],
  [TYPES.DroneModel, DroneModel],

  [TYPES.UserHelpersController, UserHelpersController],
  [TYPES.AuthController, AuthController],
  [TYPES.UsersController, UsersController],
  [TYPES.DronesController, DronesController],
  [TYPES.DroneHelpersController, DroneHelpersController],
]);

for (const [symbol, type] of typeMap) {
  container.bind<any>(symbol).to(type);
}

export const initAsync = Promise.all(
  [...typeMap.entries()]
    .filter(([, type]) => ASYNC_INIT in type)
    .map(([symbol]) => container.get<any>(symbol)[ASYNC_INIT] as Promise<any>),
);
