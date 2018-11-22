#!/usr/bin/node

import * as yargs from 'yargs';

import { DbConnection } from '../services/db-connection.class'
import { TableNames } from '../services/table-schemas.service';
import { dropTables } from '../services/table-schemas.service';

const argv = yargs
  .usage(`Run it to drop tables in database.`)
  .version().alias('v', 'version')
  .option('tables', {
    alias: 't',
    array: true,
    choices: TableNames as any,
    default: TableNames,
    desc: 'Specify tables to operate.',
  })
  .option('unsafe', {
    alias: 'S',
    boolean: true,
    default: false,
    description: 'Don\'t check if tables exist'
  })
  .help('help').alias('h', 'help')
  .argv;

(async () => {
  try {
    console.log('Tables to work with: ' + argv.tables.join(', '));
    const { knex } = new DbConnection();
    console.log('Dropping tables....');
    await Promise.all(dropTables(knex, !argv.unsafe, argv.tables, (table, builder) => {
      builder.then(() => {
        console.log(`Dropped ${table}`);
      }).catch(err => {
        console.error(`Error with ${table}: ${err.message}`);
      }).then(() => console.debug(`\n${builder.toQuery()}\n`));
    }));
    console.log('Done. Bye!');
  } catch (err) {
    console.error('Error occured: ');
    console.error(err.message);
  } finally {
    process.emit('SIGINT', 'SIGINT');
  }
})();
