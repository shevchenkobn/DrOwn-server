#!/usr/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const db_connection_class_1 = require("../services/db-connection.class");
const table_schemas_service_1 = require("../services/table-schemas.service");
const table_schemas_service_2 = require("../services/table-schemas.service");
const tableNames = Object.values(table_schemas_service_1.TableName);
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
    const { knex } = new db_connection_class_1.DbConnection();
    if (argv.drop) {
        console.log('Dropping tables....');
        await Promise.all(table_schemas_service_2.dropTables(knex, argv.tables));
    }
    console.log('Creating tables...');
    await Promise.all(table_schemas_service_2.createTables(knex, argv.tables));
    console.log('Done. Bye!');
})().catch(err => {
    console.error('Error occured: ');
    console.error(err.stack);
});
//# sourceMappingURL=add-sql-tables.js.map