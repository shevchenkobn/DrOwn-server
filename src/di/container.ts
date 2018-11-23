import { TYPES } from './types';
import { Container } from 'inversify';
import { DbConnection } from '../services/db-connection.class';
import { UserModel } from '../models/users.model';

export const container = new Container({
  defaultScope: 'Singleton',
});

container.bind<DbConnection>(TYPES.DbConnection).to(DbConnection);
container.bind<UserModel>(TYPES.UserModel).to(UserModel);
