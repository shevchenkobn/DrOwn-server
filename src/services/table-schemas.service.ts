import * as Knex from 'knex';

export enum TableName {
  Users = 'users',
  Employees = 'employees',
  Drones = 'drones',
  DroneOrders = 'droneOrders',
  DroneMeasurements = 'droneMeasurements',
  Transactions = 'transactions',
  Reports = 'reports',
  Notifications = 'reports',
}

const tablesToCreate = new Map<TableName, (knex: Knex) => Knex.SchemaBuilder>([
  [TableName.Users, knex => {
    return knex.schema.createTable(TableName.Users, table => {
      table.bigIncrements('userId')
        .primary(`pk_${TableName.Users}`);

      table.string('email', 60).notNullable();
      table.string('passwordHash', 60).notNullable();
      table.integer('role').notNullable().defaultTo(0);

      table.string('name', 120).notNullable();
      table.bigInteger('companyId').nullable()
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
      table.bigIncrements('employeeId')
        .references(`${TableName.Users}.userId`).onDelete('DELETE');
      table.bigIncrements('companyId')
        .references(`${TableName.Users}.userId`).onDelete('DELETE');

      table.string('email', 60).notNullable();
      table.string('password', 60).notNullable();
      table.integer('role').notNullable().defaultTo(0);
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));

      table.string('name', 120).notNullable();
      table.bigInteger('companyId').nullable()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.string('address', 150).nullable();
      table.string('phoneNumber', 15).nullable();

      table.string('refreshToken').nullable();
      table.date('refreshTokenExpiration').nullable();
    });
  }],
  [TableName.Drones, knex => {
    return knex.schema.createTable(TableName.Drones, table => {
      table.bigIncrements('droneId')
        .primary(`pk_${TableName.Drones}`);
      table.bigInteger('producerId')
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.bigInteger('ownerId')
        .references(`${TableName.Users}.userId`).onDelete('RESTRICT');

      table.string('passwordHash').notNullable();
      table.string('producer', 120).nullable();
      table.string('model', 120).notNullable();
      table.string('serialNumber', 120).notNullable();
      table.integer('status').notNullable();
      table.decimal('baseLongitude', 9, 6).notNullable();
      table.decimal('baseLatitude', 9, 6).notNullable();

      table.integer('batteryPower').notNullable();
      table.integer('enginePower').notNullable();
      table.integer('loadCapacity').notNullable();
      table.boolean('canCarryLiquids').notNullable();

      table.boolean('isWritingTelemetry').notNullable().defaultTo(true);
    });
  }],
  [TableName.DroneOrders, knex => {
    return knex.schema.createTable(TableName.DroneOrders, table => {
      table.bigIncrements('droneId')
        .primary(`pk_${TableName.Drones}`);
      table.bigInteger('userId')
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');

      table.integer('action').notNullable();
      table.decimal('longitude', 9, 6).nullable();
      table.decimal('latitude', 9, 6).nullable();
    });
  }],
  [TableName.DroneMeasurements, knex => {
    return knex.schema.createTable(TableName.DroneMeasurements, table => {
      table.bigIncrements('droneId')
        .references(`${TableName.Drones}.droneId`).onDelete('CASCADE');
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));

      table.integer('status').notNullable();
      table.integer('batteryPower').notNullable();
      table.decimal('longitude', 9, 6).notNullable();
      table.decimal('latitude', 9, 6).notNullable();
      table.integer('batteryCharge').notNullable();
      table.integer('problemCodes').notNullable().defaultTo(0);

    });
  }],
  [TableName.Transactions, knex => {
    return knex.schema.createTable(TableName.Transactions, table => {
      table.bigInteger('transactionId')
        .primary(`pk_${TableName.Transactions}`);
      table.bigIncrements('droneId')
        .references(`${TableName.Drones}.droneId`).onDelete('CASCADE');
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
      table.integer('actionType').notNullable();
      table.bigInteger('user1Id')
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.bigInteger('user2Id').nullable()
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.integer('status').notNullable();
      table.decimal('sum', 8, 2).nullable();
      table.integer('period').notNullable().defaultTo(0);
      // table.text('additionalInfo').nullable();
    });
  }],
  [TableName.Reports, knex => {
    return knex.schema.createTable(TableName.Reports, table => {
      table.bigInteger('reportId')
        .primary(`pk_${TableName.Reports}`);
      table.bigIncrements('reporterId')
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.bigIncrements('droneId').notNullable()
        .references(`${TableName.Drones}.droneId`).onDelete('CASCADE');
      table.bigIncrements('reportedId').nullable()
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.bigIncrements('adminId').nullable()
        .references(`${TableName.Users}.userId`).onDelete('SET NULL');
      table.integer('type').notNullable();
      table.integer('status').notNullable();
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
      table.string('title', 256).notNullable();
      table.text('text').notNullable();
      table.integer('mark').nullable();
    });
  }],
  [TableName.Notifications, knex => {
    return knex.schema.createTable(TableName.Notifications, table => {
      table.bigIncrements('userId')
        .references(`${TableName.Users}.userId`).onDelete('CASCADE');
      table.integer('type').notNullable();
      table.timestamp('createdAt', 6 as any).defaultTo((knex.fn.now as any)(6));
      table.bigIncrements('entityId').nullable();
    });
  }],
]);

export function dropTables(knex: Knex, safe = true, tables: TableName[] = Object.values(TableName)) {
  return tables.map(table => safe ? knex.schema.dropTableIfExists(table) : knex.schema.dropTable(table));
}

export function createTables(knex: Knex, safe = true, tables: TableName[] = Object.values(TableName)) {
  return tables.map(table => new Promise<Knex.TableBuilder | null>(async (resolve, reject) => {
    if (safe && await knex.schema.hasTable(table)) {
      resolve(null);
    }
    resolve(tablesToCreate.get(table)!(knex));
  }));
}


