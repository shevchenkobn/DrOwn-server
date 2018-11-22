#!/usr/bin/node

import * as yargs from 'yargs';

import { DbConnection } from '../services/db-connection.class'
import { TableName } from '../services/table-schemas.service';
import { dropTables, createTables } from '../services/table-schemas.service';

const tableNames = Object.values(TableName);

const argv = yargs
  .usage(`Run it to create or recreate tables in database.`)
  .version().alias('v', 'version')
  .option('tables', {
    alias: 't',
    array: true,
    choices: tableNames,
    default: tableNames,
    desc: 'Specify tables to operate.',
  })
  .option('drop', {
    alias: 'd',
    boolean: true,
    default: false,
    description: 'Checks if tables should be dropped before recreating'
  })
  .help('help').alias('h', 'help')
  .argv;

(async () => {
  console.log('Tables to work with: ' + argv.tables.join(', '));
  const { knex } = new DbConnection();
  if (argv.drop) {
    console.log('Dropping tables....');
    await Promise.all(dropTables(knex, argv.tables));
  }
  console.log('Creating tables...');
  await Promise.all(createTables(knex, argv.tables));
  console.log('Done. Bye!');
})().catch(err => {
  console.error('Error occured: ');
  console.error(err.stack);
});
