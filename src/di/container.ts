import { ASYNC_INIT, TYPES } from './types';
import { Container } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import { UserModel } from '../models/users.model';
import { JwtAuthetication } from '../services/authentication.class';
import { UserRolesController } from '../controllers/user-roles.controller';

export const container = new Container({
  defaultScope: 'Singleton',
});

const typeMap = new Map<symbol, any>([
  [TYPES.DbConnection, DbConnection],

  [TYPES.JwtAuthorization, JwtAuthetication],

  [TYPES.UserModel, UserModel],

  [TYPES.UserRolesController, UserRolesController],
]);

for (const [symbol, type] of typeMap) {
  container.bind<any>(symbol).to(type);
}

export const initAsync = Promise.all(
  [...typeMap.entries()]
    .map(([symbol]) => container.get(symbol))
    .filter(instance => ASYNC_INIT in instance)
    .map(instance => (instance as any)[ASYNC_INIT]),
);
