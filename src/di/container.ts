import { ASYNC_INIT, TYPES } from './types';
import { Container } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import { UserModel } from '../models/users.model';
import { JwtAuthetication } from '../services/authentication.class';

export const container = new Container({
  defaultScope: 'Singleton',
});

const typeMap = new Map<symbol, any>([
  [TYPES.DbConnection, DbConnection],
  [TYPES.UserModel, UserModel],
  [TYPES.JwtAuthorization, JwtAuthetication],
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
