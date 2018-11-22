#!/usr/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const db_connection_class_1 = require("../services/db-connection.class");
const table_schemas_service_1 = require("../services/table-schemas.service");
const table_schemas_service_2 = require("../services/table-schemas.service");
const argv = yargs
    .usage(`Run it to create or recreate tables in database.`)
    .version().alias('v', 'version')
    .option('tables', {
    alias: 't',
    array: true,
    choices: table_schemas_service_1.TableNames,
    default: table_schemas_service_1.TableNames,
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
        const { knex } = new db_connection_class_1.DbConnection();
        if (argv.drop) {
            console.log('Dropping tables....');
            await Promise.all(table_schemas_service_2.dropTables(knex, true, argv.tables, (table, builder) => {
                builder.then(() => {
                    console.log(`Dropped ${table}`);
                }).catch(err => {
                    console.error(`Error with ${table}: ${err.message}`);
                }).then(() => console.debug(`\n${builder.toQuery()}\n`));
            }));
        }
        // return;
        console.log('Creating tables...');
        // const tablePromises = createTables(knex, true, argv.tables);
        // for (const promise of tablePromises) {
        //   const builder =
        // }
        await Promise.all(await table_schemas_service_2.createTables(knex, true, argv.tables, (table, builder) => {
            if (!builder) {
                console.log(`${table} already exists`);
                return;
            }
            console.log(`Creating ${table}`);
            // builder.then(() => {
            //   console.log(`Created ${table}`);
            // }).catch(err => {
            //   console.error(`Error with ${table}: ${err.message}`);
            // }).then(() => console.debug(`\n${builder.toQuery()}\n`));
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
//# sourceMappingURL=add-sql-tables.js.map