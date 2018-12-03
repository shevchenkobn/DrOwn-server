import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DbConnection } from '../services/db-connection.class';

@injectable()
export class DroneModel {
  constructor(
    @inject(TYPES.DbConnection) dbConnection: DbConnection,
  ) {

  }
}