#!/usr/bin/node

import * as yargs from 'yargs';

import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DbConnection } from '../services/db-connection.class';
import { tableNames } from '../services/table-schemas.service';
import { dropTables } from '../services/table-schemas.service';
import { bindOnExitHandler } from '../services/util.service';

const argv = yargs
  .usage('Run it to drop tables in database.')
  .version().alias('v', 'version')
  .option('tables', {
    alias: 't',
    array: true,
    choices: tableNames as any,
    default: tableNames,
    desc: 'Specify tables to operate.',
  })
  .option('unsafe', {
    alias: 'S',
    boolean: true,
    default: false,
    description: 'Don\'t check if tables exist',
  })
  .help('help').alias('h', 'help')
  .argv;

(async () => {
  try {
    console.log(`Tables to work with: ${argv.tables.join(', ')}`);
    const { knex } = container.get<DbConnection>(TYPES.DbConnection);
    console.log('Dropping tables....');
    await dropTables(knex, true, argv.tables, (table, sql) => {
      console.log(`Dropped "${table}" with """${sql}"""`);
    });
    console.log('Done. Bye!');
  } catch (err) {
    console.error('Error occured: ');
    console.error(err.message);
    bindOnExitHandler(() => process.exit(1));
  } finally {
    process.emit('SIGINT', 'SIGINT');
  }
})();
