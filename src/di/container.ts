import { ASYNC_INIT, TYPES } from './types';
import { Container } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import { UserModel } from '../models/users.model';
import { AuthService } from '../services/authentication.class';
import { UserHelpersController } from '../model-controllers/user-helpers.controller';
import { UsersController } from '../model-controllers/users.controller';
import { AuthController } from '../model-controllers/auth.controller';
import { DroneModel } from '../models/drones.model';
import { DronesController } from '../model-controllers/drones.controller';
import { DroneHelpersController } from '../model-controllers/drone-helpers.controller';
import { AutobahnController } from '../controllers/autobahn.controller';
import * as config from 'config';
import { ServerConfig } from '../index';

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

  [TYPES.AutobahnController, AutobahnController],
]);

container.bind<ServerConfig>(TYPES.ServerConfig).toConstantValue(
  config.get<ServerConfig>('server'),
);

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
