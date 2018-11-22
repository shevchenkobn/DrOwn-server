import * as Knex from 'knex';
import * as config from 'config';

export class DbConnection {
  public readonly knex: Knex;

  constructor(knexConfig = config.get<Knex.Config>('knex')) {
    this.knex = Knex(knexConfig);
  }
}