import * as Knex from 'knex';

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

export const TableNames: ReadonlyArray<TableName> = Object.values(TableName);

const tablesToCreate = new Map<TableName, (knex: Knex) => Knex.SchemaBuilder>([
  [TableName.Users, knex => {
    return knex.schema.createTable(TableName.Users, table => {
      table.bigIncrements('userId')
        .primary(`pk_${TableName.Users}`);

      table.string('email', 60).notNullable();
      table.string('passwordHash', 60).notNullable();
      table.integer('role').unsigned().notNullable().defaultTo(0);

      table.string('name', 120).notNullable();
      table.bigInteger('companyId').unsigned().nullable()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.string('address', 150).nullable();
      table.string('phoneNumber', 15).nullable();
      table.decimal('cash', 9, 2).notNullable().defaultTo(0);

      table.string('refreshToken').nullable();
      table.date('refreshTokenExpiration').nullable();
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
      // table.text('additionalInfo').nullable();
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

export function dropTables(
  knex: Knex,
  safe = true,
  tables = TableNames,
  forEachCb?: (tableName: string, builder: Knex.SchemaBuilder) => any
) {
  return TableNames.slice().filter(t => tables.includes(t)).reverse().map(table => {
    const result = safe ? knex.schema.dropTableIfExists(table) : knex.schema.dropTable(table);
    forEachCb && forEachCb(table, result);
    return result;
  }).reverse();
}

export async function createTables(
  knex: Knex,
  safe = true,
  tables = TableNames,
  forEachCb?: (tableName: string, builder: Knex.SchemaBuilder | null) => any
) {
  const orderedTables = TableNames.slice().filter(t => tables.includes(t));

  const results: Array<Knex.SchemaBuilder | null> = [];

  for (let i = 0; i < orderedTables.length; i++) {
    const table = orderedTables[i];
    if (i > 0) {
      await results[i - 1];
    }
    let builder = null;
    if (!safe || !(await knex.schema.hasTable(table))) {
      builder = tablesToCreate.get(table)!(knex);
    }
    forEachCb && forEachCb(table, builder);
    results.push(builder)
  }
  return results;

  // return tables.map((table, i) => (
  //   new Promise<Knex.SchemaBuilder | null>(async (resolve, reject) => {
  //     if (i > 0) {
  //
  //     }
  //     let builder = null;
  //     if (!safe || !(await knex.schema.hasTable(table))) {
  //       builder = tablesToCreate.get(table)!(knex);
  //     }
  //     forEachCb && forEachCb(table, builder);
  //     resolve(tablesToCreate.get(table)!(knex));
  //   })
  // ));
}


