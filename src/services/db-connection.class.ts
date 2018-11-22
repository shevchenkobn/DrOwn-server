import * as Knex from 'knex';
import * as config from 'config';
import { bindCallbackOnExit } from './util.service';

export class DbConnection {
  public readonly config: Readonly<Knex.Config>;
  public readonly knex: Knex;

  constructor(knexConfig = config.get<Knex.Config>('knex')) {
    this.config = knexConfig;
    this.knex = Knex(knexConfig);
    bindCallbackOnExit(() => {
      // TODO: add logging
      console.log(`Closing database connection for ${knexConfig.client} mysql at ${(knexConfig.connection as any).host} to ${(knexConfig.connection as any).database}`);
      this.knex.destroy(() => console.log(`Closed database connection for ${knexConfig.client} mysql at ${(knexConfig.connection as any).host} to ${(knexConfig.connection as any).database}`));
    });
  }
}