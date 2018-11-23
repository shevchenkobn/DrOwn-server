#!/usr/bin/node

import * as yargs from 'yargs';

import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DbConnection } from '../services/db-connection.class';
import { tableNames } from '../services/table-schemas.service';
import { dropTables, createTables } from '../services/table-schemas.service';
import { seedDatabase } from '../services/table-schemas.service';

const argv = yargs
  .usage('Run it to create or recreate tables in database.')
  .version().alias('v', 'version')
  .option('tables', {
    alias: 't',
    array: true,
    choices: tableNames as any,
    default: tableNames,
    desc: 'Specify tables to operate.',
  })
  .option('drop', {
    alias: 'd',
    boolean: true,
    default: false,
    description: 'Checks if tables should be dropped before recreating',
  })
  .option('no-seed', {
    alias: 'S',
    boolean: true,
    default: false,
    description: 'Don\'t add minimal necessary data to database',
  })
  .help('help').alias('h', 'help')
  .argv;

(async () => {
  try {
    console.log(`Tables to work with: ${argv.tables.join(', ')}`);
    const { knex } = container.get<DbConnection>(TYPES.DbConnection);
    if (argv.drop) {
      console.log('Dropping tables....');
      await dropTables(knex, true, argv.tables, (table, sql) => {
        console.log(`Dropped "${table}" with """${sql}"""`);
      });
    }
    console.log('Creating tables...');
    await createTables(knex, true, argv.tables, (table, exists, sql) => {
      if (exists) {
        console.log(`${table} already exists`);
        return;
      }
      console.log(`Creating "${table}" with """${sql}"""`);
    });
    if (!argv.noSeed) {
      console.log('Seeding database...');
      await seedDatabase(knex);
    }
    console.log('Done. Bye!');
  } catch (err) {
    console.error('Error occured: ');
    console.error(err.message);
  } finally {
    process.emit('SIGINT', 'SIGINT');
  }
})();
