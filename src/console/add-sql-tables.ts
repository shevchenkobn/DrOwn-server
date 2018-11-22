#!/usr/bin/node

import * as yargs from 'yargs';

import { DbConnection } from '../services/db-connection.class'
import { TableNames } from '../services/table-schemas.service';
import { dropTables, createTables } from '../services/table-schemas.service';

const argv = yargs
  .usage(`Run it to create or recreate tables in database.`)
  .version().alias('v', 'version')
  .option('tables', {
    alias: 't',
    array: true,
    choices: TableNames as any,
    default: TableNames,
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
  try {
    console.log('Tables to work with: ' + argv.tables.join(', '));
    const {knex} = new DbConnection();
    if (argv.drop) {
      console.log('Dropping tables....');
      await dropTables(knex, true, argv.tables, (table, sql) => {
        console.log(`Dropped "${table}" with """${sql}"""`);
      });
    }
    // return;
    console.log('Creating tables...');
    // const tablePromises = createTables(knex, true, argv.tables);
    // for (const promise of tablePromises) {
    //   const builder =
    // }
    await createTables(knex, true, argv.tables, (table, exists, sql) => {
      if (exists) {
        console.log(`${table} already exists`);
        return;
      }
      console.log(`Creating "${table}" with """${sql}"""`);
      // builder.then(() => {
      //   console.log(`Created ${table}`);
      // }).catch(err => {
      //   console.error(`Error with ${table}: ${err.message}`);
      // }).then(() => console.debug(`\n${builder.toQuery()}\n`));
    });
    console.log('Done. Bye!');
  } catch (err) {
    console.error('Error occured: ');
    console.error(err.message);
  } finally {
    process.emit('SIGINT', 'SIGINT');
  }
})();
