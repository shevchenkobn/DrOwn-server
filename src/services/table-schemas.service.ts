import * as Knex from 'knex';
import * as config from 'config';
import { TYPES } from '../di/types';
import { container } from '../di/container';
import { IUser, IUserSeed, UserModel, UserRoles } from '../models/users.model';
import { TableName } from './table-names';

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
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.decimal('price', 8, 2).nullable();

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
  [TableName.DroneOrders, knex => {
    return knex.schema.createTable(TableName.DroneOrders, table => {
      table.bigIncrements('droneOrderId').unsigned()
        .primary(`pk_${TableName.DroneOrders}`);
      table.string('deviceId').notNullable()
        .references(`${TableName.Drones}.deviceId`).onDelete('CASCADE');
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));

      table.integer('action').unsigned().notNullable();
      table.integer('status').unsigned().nullable();
      table.decimal('longitude', 9, 6).nullable();
      table.decimal('latitude', 9, 6).nullable();
    });
  }],
  [TableName.DroneMeasurements, knex => {
    return knex.schema.createTable(TableName.DroneMeasurements, table => {
      table.string('deviceId').notNullable()
        .references(`${TableName.Drones}.deviceId`).onDelete('CASCADE');
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));

      table.integer('status').unsigned().notNullable();
      table.decimal('longitude', 9, 6).notNullable();
      table.decimal('latitude', 9, 6).notNullable();
      table.decimal('batteryCharge', 9, 6).unsigned().notNullable();

    });
  }],
  // [TableName.Notifications, knex => {
  //   return knex.schema.createTable(TableName.Notifications, table => {
  //     table.bigInteger('userId').unsigned()
  //       .references(`${TableName.Users}.userId`).onDelete('CASCADE');
  //     table.integer('type').unsigned().notNullable();
  //     table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
  //     table.bigInteger('entityId').unsigned().nullable();
  //   });
  // }],
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

export const superAdminUserId = '1';

export async function seedDatabase(knex: Knex) {
  const adminData = config.get<{ name: string, password: string, email: string }>('server.admin');
  const adminUser: IUserSeed & { userId: string } = {
    ...adminData,
    role: UserRoles.OWNER
      | UserRoles.ADMIN,
    userId: superAdminUserId,
  };

  await container.get<UserModel>(TYPES.UserModel).create(adminUser);
}
