import '../di/types';
import * as Knex from 'knex';
import * as config from 'config';
import { bindCallbackOnExit } from './util.service';
import { injectable } from 'inversify';

@injectable()
export class DbConnection {
  public readonly config: Readonly<Knex.Config>;
  public readonly knex: Knex;

  constructor(knexConfig = config.get<{
    host: string, user: string, password: string, database: string
  }>('dbConnection')) {
    this.config = {
      client: 'mysql',
      connection: {
        ...knexConfig,
        supportBigNumbers: true,
        bigNumberStrings: true,
      },
    };
    this.knex = Knex(this.config);
    bindCallbackOnExit(() => {
      // TODO: add logging
      console.log(`Closing database connection for ${this.config.client} at ${(this.config.connection as any).host} to ${(this.config.connection as any).database}`);
      this.knex.destroy(() => console.log(`Closed database connection for ${this.config.client} mysql at ${(this.config.connection as any).host} to ${(this.config.connection as any).database}`));
    });
  }
}
