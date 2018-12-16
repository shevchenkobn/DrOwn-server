"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = require("config");
const types_1 = require("../di/types");
const container_1 = require("../di/container");
const users_model_1 = require("../models/users.model");
const table_names_1 = require("./table-names");
// export enum TableName { // NOTE: the order is important otherwise errors with foreign keys
//   Users = 'users',
//   Drones = 'drones',
//   DronePrices = 'dronePrices',
//   Transactions = 'transactions',
//   DroneOrders = 'droneOrders',
//   DroneMeasurements = 'droneMeasurements',
//   // Notifications = 'notifications',
// }
exports.tableNames = Object.values(table_names_1.TableName);
const tablesToCreate = new Map([
    [table_names_1.TableName.Users, knex => {
            return knex.schema.createTable(table_names_1.TableName.Users, table => {
                table.bigIncrements('userId')
                    .primary(`pk_${table_names_1.TableName.Users}`);
                table.string('email', 120).notNullable().unique(`unique_email_${table_names_1.TableName.Users}`);
                table.string('passwordHash', 60).notNullable();
                table.integer('role').unsigned().notNullable().defaultTo(0);
                table.integer('status').unsigned().notNullable().defaultTo(0);
                table.string('name', 120).notNullable();
                table.string('address', 150).nullable();
                table.string('phoneNumber', 15).nullable();
                table.decimal('longitude', 9, 6).nullable();
                table.decimal('latitude', 9, 6).nullable();
                table.decimal('cash', 9, 2).notNullable().defaultTo(0);
                table.string('refreshToken').nullable().unique(`unique_refreshToken_${table_names_1.TableName.Users}`);
                table.dateTime('refreshTokenExpiration').nullable();
            });
        }],
    [table_names_1.TableName.Drones, knex => {
            return knex.schema.createTable(table_names_1.TableName.Drones, table => {
                table.bigIncrements('droneId').unsigned()
                    .primary(`pk_${table_names_1.TableName.Drones}`);
                table.bigInteger('producerId').unsigned()
                    .references(`${table_names_1.TableName.Users}.userId`).onDelete('SET NULL');
                table.bigInteger('ownerId').unsigned()
                    .references(`${table_names_1.TableName.Users}.userId`).onDelete('RESTRICT');
                table.string('deviceId').notNullable().unique();
                table.string('passwordHash', 60).notNullable().defaultTo('');
                table.integer('status').unsigned().notNullable().defaultTo(0);
                table.decimal('baseLongitude', 9, 6).notNullable();
                table.decimal('baseLatitude', 9, 6).notNullable();
                table.integer('batteryPower').unsigned().notNullable();
                table.integer('enginePower').unsigned().notNullable();
                table.integer('loadCapacity').unsigned().notNullable();
                table.boolean('canCarryLiquids').notNullable();
            });
        }],
    [table_names_1.TableName.DroneOrders, knex => {
            return knex.schema.createTable(table_names_1.TableName.DroneOrders, table => {
                table.bigIncrements('droneOrderId').unsigned()
                    .primary(`pk_${table_names_1.TableName.DroneOrders}`);
                table.string('deviceId').notNullable().unique()
                    .references(`${table_names_1.TableName.Drones}.deviceId`).onDelete('CASCADE');
                table.bigInteger('userId').unsigned()
                    .references(`${table_names_1.TableName.Users}.userId`).onDelete('SET NULL');
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.integer('action').unsigned().notNullable();
                table.integer('status').unsigned().notNullable();
                table.decimal('longitude', 9, 6).nullable();
                table.decimal('latitude', 9, 6).nullable();
            });
        }],
    [table_names_1.TableName.DroneMeasurements, knex => {
            return knex.schema.createTable(table_names_1.TableName.DroneMeasurements, table => {
                table.string('deviceId').notNullable().unique()
                    .references(`${table_names_1.TableName.Drones}.deviceId`).onDelete('CASCADE');
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.integer('status').unsigned().notNullable();
                table.integer('batteryPower').unsigned().notNullable();
                table.decimal('longitude', 9, 6).notNullable();
                table.decimal('latitude', 9, 6).notNullable();
                table.integer('batteryCharge').unsigned().notNullable();
            });
        }],
    [table_names_1.TableName.DronePrices, knex => {
            return knex.schema.createTable(table_names_1.TableName.DronePrices, table => {
                table.bigIncrements('priceId')
                    .primary(`pk_${table_names_1.TableName.DronePrices}`);
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.bigInteger('droneId').unsigned()
                    .references(`${table_names_1.TableName.Drones}.droneId`).onDelete('CASCADE');
                table.integer('actionType').unsigned().notNullable();
                table.decimal('price', 8, 2).nullable();
                table.boolean('isActive').notNullable().defaultTo(false);
                // knex.text('additionalInfo').nullable();
            });
        }],
    [table_names_1.TableName.Transactions, knex => {
            return knex.schema.createTable(table_names_1.TableName.Transactions, table => {
                table.bigIncrements('transactionId')
                    .primary(`pk_${table_names_1.TableName.Transactions}`);
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.bigInteger('priceId').unsigned().notNullable()
                    .references(`${table_names_1.TableName.DronePrices}.priceId`).onDelete('CASCADE');
                table.bigInteger('userId').unsigned().notNullable()
                    .references(`${table_names_1.TableName.Users}.userId`).onDelete('CASCADE');
                table.integer('status').unsigned().notNullable().defaultTo(0);
                table.integer('period').unsigned().notNullable().defaultTo(0);
                // knex.text('additionalInfo').nullable();
            });
        }],
]);
async function dropTables(knex, safe = true, tables = exports.tableNames, forEachCb) {
    const orderedTables = exports.tableNames.slice().filter(t => tables.includes(t)).reverse();
    let builder = null;
    for (let i = 0; i < orderedTables.length; i += 1) {
        const table = orderedTables[i];
        builder = safe ? knex.schema.dropTableIfExists(table) : knex.schema.dropTable(table);
        await builder;
        forEachCb && forEachCb(table, builder ? builder.toQuery() : '');
    }
}
exports.dropTables = dropTables;
async function createTables(knex, safe = true, tables = exports.tableNames, forEachCb) {
    const orderedTables = exports.tableNames.slice().filter(t => tables.includes(t));
    let builder = null;
    for (let i = 0; i < orderedTables.length; i += 1) {
        const table = orderedTables[i];
        const exists = await knex.schema.hasTable(table);
        if (!safe || !exists) {
            builder = tablesToCreate.get(table)(knex);
            await builder;
        }
        forEachCb && forEachCb(table, exists, builder ? builder.toQuery() : '');
    }
}
exports.createTables = createTables;
exports.superAdminUserId = '1';
async function seedDatabase(knex) {
    const adminData = config.get('server.admin');
    const adminUser = {
        ...adminData,
        role: users_model_1.UserRoles.CUSTOMER
            | users_model_1.UserRoles.OWNER
            | users_model_1.UserRoles.LANDLORD
            | users_model_1.UserRoles.PRODUCER
            | users_model_1.UserRoles.ADMIN,
        userId: exports.superAdminUserId,
    };
    await container_1.container.get(types_1.TYPES.UserModel).create(adminUser);
}
exports.seedDatabase = seedDatabase;
//# sourceMappingURL=table-schemas.service.js.map