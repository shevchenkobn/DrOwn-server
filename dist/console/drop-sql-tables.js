#!/usr/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const db_connection_class_1 = require("../services/db-connection.class");
const table_schemas_service_1 = require("../services/table-schemas.service");
const table_schemas_service_2 = require("../services/table-schemas.service");
const argv = yargs
    .usage(`Run it to drop tables in database.`)
    .version().alias('v', 'version')
    .option('tables', {
    alias: 't',
    array: true,
    choices: table_schemas_service_1.TableNames,
    default: table_schemas_service_1.TableNames,
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
        const { knex } = new db_connection_class_1.DbConnection();
        console.log('Dropping tables....');
        await Promise.all(table_schemas_service_2.dropTables(knex, !argv.unsafe, argv.tables, (table, builder) => {
            builder.then(() => {
                console.log(`Dropped ${table}`);
            }).catch(err => {
                console.error(`Error with ${table}: ${err.message}`);
            }).then(() => console.debug(`\n${builder.toQuery()}\n`));
        }));
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
//# sourceMappingURL=drop-sql-tables.js.map