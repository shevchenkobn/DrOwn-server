import * as Knex from 'knex';
import * as config from 'config';
import { TYPES } from '../di/types';
import { container } from '../di/container';
import { IUserSeed, UserModel, UserRoles } from '../models/users.model';

export enum TableName { // NOTE: the order is important otherwise errors with foreign keys
  Users = 'users',
  Employees = 'employees',
  Drones = 'drones',
  DroneOrders = 'droneOrders',
  DroneMeasurements = 'droneMeasurements',
  Transactions = 'transactions',
  Reports = 'reports',
  Notifications = 'notifications',
}

export const tableNames: ReadonlyArray<TableName> = Object.values(TableName);

const tablesToCreate = new Map<TableName, (knex: Knex) => Knex.SchemaBuilder>([
  [TableName.Users, knex => {
    return knex.schema.createTable(TableName.Users, table => {
      table.bigIncrements('userId')
        .primary(`pk_${TableName.Users}`);

      table.string('email', 120).notNullable().unique(`unique_email_${TableName.Users}`);
      table.string('passwordHash', 60).notNullable();
      table.integer('role').unsigned().notNullable().defaultTo(0);

      table.string('name', 120).notNullable();
      table.bigInteger('companyId').unsigned().nullable()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.string('address', 150).nullable();
      table.string('phoneNumber', 15).nullable();
      table.decimal('cash', 9, 2).notNullable().defaultTo(0);

      table.string('refreshToken').nullable().unique(`unique_refreshToken_${TableName.Users}`);
      table.dateTime('refreshTokenExpiration').nullable();
    });
  }],
  [TableName.Employees, knex => {
    return knex.schema.createTable(TableName.Employees, table => {
      table.bigInteger('employeeId').unsigned()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.bigInteger('companyId').unsigned()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
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
      table.string('passwordHash').notNullable();
      table.string('producer', 120).nullable();
      table.string('model', 120).notNullable();
      table.string('serialNumber', 120).notNullable();
      table.integer('status').unsigned().notNullable();
      table.decimal('baseLongitude', 9, 6).notNullable();
      table.decimal('baseLatitude', 9, 6).notNullable();

      table.integer('batteryPower').unsigned().notNullable();
      table.integer('enginePower').unsigned().notNullable();
      table.integer('loadCapacity').unsigned().notNullable();
      table.boolean('canCarryLiquids').notNullable();

      table.boolean('isWritingTelemetry').notNullable().defaultTo(true);

      table.unique(['producer', 'model', 'serialNumber'], `unique_${TableName.Drones}`);
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
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));

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
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
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
  [TableName.Reports, knex => {
    return knex.schema.createTable(TableName.Reports, table => {
      table.bigIncrements('reportId')
        .primary(`pk_${TableName.Reports}`);
      table.bigInteger('reporterId').unsigned()
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.bigInteger('droneId').unsigned().notNullable()
        .references(`${TableName.Drones}.droneId`).onDelete('CASCADE');
      table.bigInteger('reportedId').unsigned().nullable()
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.bigInteger('adminId').unsigned().nullable()
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.integer('type').unsigned().notNullable();
      table.integer('status').unsigned().notNullable();
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
      table.string('title', 256).notNullable();
      table.text('text').notNullable();
      table.integer('mark').unsigned().nullable();
    });
  }],
  [TableName.Notifications, knex => {
    return knex.schema.createTable(TableName.Notifications, table => {
      table.bigInteger('userId').unsigned()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.integer('type').unsigned().notNullable();
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
      table.bigInteger('entityId').unsigned().nullable();
    });
  }],
]);

export async function dropTables(
  knex: Knex,
  safe = true,
  tables = tableNames,
  forEachCb?: (tableName: string, sql: string) => any,
) {
  const orderedTables = tableNames.slice().filter(t => tables.includes(t)).reverse();

  let builder: Knex.SchemaBuilder | null = null;

  for (let i = 0; i < orderedTables.length; i += 1) {
    const table = orderedTables[i];
    builder = safe ? knex.schema.dropTableIfExists(table) : knex.schema.dropTable(table);
    await builder;
    forEachCb && forEachCb(table, builder ? builder.toQuery() : '');
  }
}

export async function createTables(
  knex: Knex,
  safe = true,
  tables = tableNames,
  forEachCb?: (tableName: string, exists: boolean, sql: string) => any,
) {
  const orderedTables = tableNames.slice().filter(t => tables.includes(t));

  let builder: Knex.SchemaBuilder | null = null;

  for (let i = 0; i < orderedTables.length; i += 1) {
    const table = orderedTables[i];
    const exists = await knex.schema.hasTable(table);
    if (!safe || !exists) {
      builder = tablesToCreate.get(table)!(knex);
      await builder;
    }
    forEachCb && forEachCb(table, exists, builder ? builder.toQuery() : '');
  }
}

export async function seedDatabase(knex: Knex) {
  const adminData = config.get<{ name: string, password: string, email: string }>('server.admin');
  const adminUser: IUserSeed = {
    ...adminData,
    role: UserRoles.CUSTOMER
      | UserRoles.OWNER
      | UserRoles.LANDLORD
      | UserRoles.PRODUCER
      | UserRoles.MAINTAINER
      | UserRoles.MODERATOR
      | UserRoles.ADMIN
      | UserRoles.COMPANY,
  };

  await container.get<UserModel>(TYPES.UserModel).create(adminUser);
}
