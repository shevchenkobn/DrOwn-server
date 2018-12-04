"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = require("config");
const types_1 = require("../di/types");
const container_1 = require("../di/container");
const users_model_1 = require("../models/users.model");
var TableName;
(function (TableName) {
    TableName["Users"] = "users";
    TableName["Drones"] = "drones";
    TableName["DroneOrders"] = "droneOrders";
    TableName["DroneMeasurements"] = "droneMeasurements";
    TableName["Transactions"] = "transactions";
    TableName["Notifications"] = "notifications";
})(TableName = exports.TableName || (exports.TableName = {}));
exports.tableNames = Object.values(TableName);
const tablesToCreate = new Map([
    [TableName.Users, knex => {
            return knex.schema.createTable(TableName.Users, table => {
                table.bigIncrements('userId')
                    .primary(`pk_${TableName.Users}`);
                table.string('email', 120).notNullable().unique(`unique_email_${TableName.Users}`);
                table.string('passwordHash', 60).notNullable();
                table.integer('role').unsigned().notNullable().defaultTo(0);
                table.integer('status').unsigned().notNullable().defaultTo(0);
                table.string('name', 120).notNullable();
                table.string('address', 150).nullable();
                table.string('phoneNumber', 15).nullable();
                table.decimal('longitude', 9, 6).nullable();
                table.decimal('latitude', 9, 6).nullable();
                table.decimal('cash', 9, 2).notNullable().defaultTo(0);
                table.string('refreshToken').nullable().unique(`unique_refreshToken_${TableName.Users}`);
                table.dateTime('refreshTokenExpiration').nullable();
            });
        }],
    [TableName.Drones, knex => {
            return knex.schema.createTable(TableName.Drones, table => {
                table.bigIncrements('droneId').unsigned()
                    .primary(`pk_${TableName.Drones}`);
                table.bigInteger('producerId').unsigned()
                    .references(`${TableName.Users}.userId`).onDelete('SET NULL');
                table.bigInteger('ownerId').unsigned()
                    .references(`${TableName.Users}.userId`).onDelete('RESTRICT');
                table.string('deviceId').notNullable();
                table.string('passwordHash', 60).nullable();
                table.integer('status').unsigned().notNullable().defaultTo(0);
                table.decimal('baseLongitude', 9, 6).notNullable();
                table.decimal('baseLatitude', 9, 6).notNullable();
                table.integer('batteryPower').unsigned().notNullable();
                table.integer('enginePower').unsigned().notNullable();
                table.integer('loadCapacity').unsigned().notNullable();
                table.boolean('canCarryLiquids').notNullable();
                table.boolean('isWritingTelemetry').notNullable().defaultTo(true);
                table.unique(['deviceId', 'passwordHash'], `unique_${TableName.Drones}_auth`);
            });
        }],
    [TableName.DroneOrders, knex => {
            return knex.schema.createTable(TableName.DroneOrders, table => {
                table.bigInteger('droneId').unsigned()
                    .primary(`pk_${TableName.Drones}`);
                table.bigInteger('userId').unsigned()
                    .references(`${TableName.Users}.userId`).onDelete('SET NULL');
                table.integer('action').unsigned().notNullable();
                table.decimal('longitude', 9, 6).nullable();
                table.decimal('latitude', 9, 6).nullable();
            });
        }],
    [TableName.DroneMeasurements, knex => {
            return knex.schema.createTable(TableName.DroneMeasurements, table => {
                table.bigInteger('droneId').unsigned()
                    .references(`${TableName.Drones}.droneId`).onDelete('CASCADE');
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.integer('status').unsigned().notNullable();
                table.integer('batteryPower').unsigned().notNullable();
                table.decimal('longitude', 9, 6).notNullable();
                table.decimal('latitude', 9, 6).notNullable();
                table.integer('batteryCharge').unsigned().notNullable();
                table.integer('problemCodes').unsigned().notNullable().defaultTo(0);
            });
        }],
    [TableName.Transactions, knex => {
            return knex.schema.createTable(TableName.Transactions, table => {
                table.bigIncrements('transactionId')
                    .primary(`pk_${TableName.Transactions}`);
                table.bigInteger('droneId').unsigned()
                    .references(`${TableName.Drones}.droneId`).onDelete('CASCADE');
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.integer('actionType').unsigned().notNullable();
                table.bigInteger('user1Id').unsigned()
                    .references(`${TableName.Users}.userId`).onDelete('CASCADE');
                table.bigInteger('user2Id').unsigned().nullable()
                    .references(`${TableName.Users}.userId`).onDelete('CASCADE');
                table.integer('status').unsigned().notNullable();
                table.decimal('sum', 8, 2).nullable();
                table.integer('period').unsigned().notNullable().defaultTo(0);
                // knex.text('additionalInfo').nullable();
            });
        }],
    [TableName.Notifications, knex => {
            return knex.schema.createTable(TableName.Notifications, table => {
                table.bigInteger('userId').unsigned()
                    .references(`${TableName.Users}.userId`).onDelete('CASCADE');
                table.integer('type').unsigned().notNullable();
                table.timestamp('createdAt', 6).defaultTo(knex.fn.now(6));
                table.bigInteger('entityId').unsigned().nullable();
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