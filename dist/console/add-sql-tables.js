#!/usr/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const types_1 = require("../di/types");
const container_1 = require("../di/container");
const table_schemas_service_1 = require("../services/table-schemas.service");
const table_schemas_service_2 = require("../services/table-schemas.service");
const table_schemas_service_3 = require("../services/table-schemas.service");
const argv = yargs
    .usage('Run it to create or recreate tables in database.')
    .version().alias('v', 'version')
    .option('tables', {
    alias: 't',
    array: true,
    choices: table_schemas_service_1.tableNames,
    default: table_schemas_service_1.tableNames,
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
        const { knex } = container_1.container.get(types_1.TYPES.DbConnection);
        if (argv.drop) {
            console.log('Dropping tables....');
            await table_schemas_service_2.dropTables(knex, true, argv.tables, (table, sql) => {
                console.log(`Dropped "${table}" with """${sql}"""`);
            });
        }
        console.log('Creating tables...');
        await table_schemas_service_2.createTables(knex, true, argv.tables, (table, exists, sql) => {
            if (exists) {
                console.log(`${table} already exists`);
                return;
            }
            console.log(`Creating "${table}" with """${sql}"""`);
        });
        if (!argv.noSeed) {
            console.log('Seeding database...');
            await table_schemas_service_3.seedDatabase(knex);
        }
        console.log('Done. Bye!');
    }
    catch (err) {
        console.error('Error occured: ');
        console.error(err.message);
    }
    finally {
        process.emit('SIGINT', 'SIGINT');
    }
})();
//# sourceMappingURL=add-sql-tables.js.map