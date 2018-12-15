#!/usr/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const types_1 = require("../di/types");
const container_1 = require("../di/container");
const table_schemas_service_1 = require("../services/table-schemas.service");
const table_schemas_service_2 = require("../services/table-schemas.service");
const util_service_1 = require("../services/util.service");
const argv = yargs
    .usage('Run it to drop tables in database.')
    .version().alias('v', 'version')
    .option('tables', {
    alias: 't',
    array: true,
    choices: table_schemas_service_1.tableNames,
    default: table_schemas_service_1.tableNames,
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
        const { knex } = container_1.container.get(types_1.TYPES.DbConnection);
        console.log('Dropping tables....');
        await table_schemas_service_2.dropTables(knex, true, argv.tables, (table, sql) => {
            console.log(`Dropped "${table}" with """${sql}"""`);
        });
        console.log('Done. Bye!');
    }
    catch (err) {
        console.error('Error occured: ');
        console.error(err.message);
        util_service_1.bindCallbackOnExit(() => process.exit(1));
    }
    finally {
        process.emit('SIGINT', 'SIGINT');
    }
})();
//# sourceMappingURL=drop-sql-tables.js.map