"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const transactions_model_1 = require("../models/transactions.model");
const users_model_1 = require("../models/users.model");
const util_service_1 = require("../services/util.service");
const error_service_1 = require("../services/error.service");
const table_names_1 = require("../services/table-names");
const drones_model_1 = require("../models/drones.model");
const decimal_js_1 = require("decimal.js");
const db_connection_class_1 = require("../services/db-connection.class");
const scheduler_service_1 = require("../services/scheduler.service");
const container_1 = require("../di/container");
let TransactionsController = class TransactionsController {
    constructor(transactionModel, userModel, droneModel, dbConnection) {
        return {
            async getTransactions(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const transactionIds = util_service_1.getSafeSwaggerParam(req, 'transaction-ids');
                    const droneIds = util_service_1.getSafeSwaggerParam(req, 'drone-ids');
                    const userIds = util_service_1.getSafeSwaggerParam(req, 'user-ids');
                    const createdAtLimits = (util_service_1.getSafeSwaggerParam(req, 'created-at-limits') || []).map(dateStr => new Date(dateStr)).sort();
                    const periodLimits = util_service_1.getSafeSwaggerParam(req, 'period-limits');
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'), table_names_1.TableName.Transactions);
                    let query;
                    if (user.role & users_model_1.UserRoles.OWNER) {
                        query = transactionModel.table
                            .join(table_names_1.TableName.Drones, `${table_names_1.TableName.Transactions}.droneId`, `${table_names_1.TableName.Drones}.droneId`)
                            .where(`${table_names_1.TableName.Drones}.ownerId`, user.userId);
                    }
                    else {
                        query = transactionModel.table.where('userId', user.userId);
                    }
                    if (userIds) {
                        query.whereIn(`${table_names_1.TableName.Transactions}.userId`, userIds);
                    }
                    if (transactionIds) {
                        query.whereIn(`${table_names_1.TableName.Transactions}.transactionId`, transactionIds);
                    }
                    if (droneIds) {
                        query.whereIn(`${table_names_1.TableName.Transactions}.droneId`, droneIds);
                    }
                    if (createdAtLimits.length > 0) {
                        query.andWhereBetween(`${table_names_1.TableName.Transactions}.createdAt`, createdAtLimits);
                    }
                    if (periodLimits) {
                        query.andWhereBetween(`${table_names_1.TableName.Transactions}.period`, periodLimits);
                    }
                    util_service_1.appendOrderBy(query, sortings);
                    console.debug(query.toQuery());
                    res.json(await query);
                }
                catch (err) {
                    next(err);
                }
            },
            async initiateTransaction(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const transaction = req.swagger.params.transaction.value;
                    const dronePriceData = await droneModel.table.columns([
                        `${table_names_1.TableName.Drones}.price as price`,
                        `${table_names_1.TableName.Drones}.status as droneStatus`,
                        `${table_names_1.TableName.Drones}.ownerId as ownerId`,
                    ]).where({ droneId: transaction.droneId });
                    if (dronePriceData.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_DRONE_ID));
                        return;
                    }
                    const droneInfo = dronePriceData[0];
                    if (droneInfo.ownerId === user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_USER_SAME));
                        return;
                    }
                    if (droneInfo.droneStatus !== drones_model_1.DroneStatus.IDLE) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD));
                        return;
                    }
                    const sum = new decimal_js_1.Decimal(droneInfo.price).mul(transaction.period);
                    if (sum.greaterThan(user.cash)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_CASH));
                        return;
                    }
                    await dbConnection.knex.transaction(async (trx) => {
                        try {
                            await userModel.table
                                .where({ userId: droneInfo.userId })
                                .update({
                                cash: dbConnection.knex.raw(`cash - ${sum.toString()}`),
                            })
                                .transacting(trx);
                            await droneModel.table
                                .where({ ownerId: droneInfo.userId })
                                .update({ status: drones_model_1.DroneStatus.RENTED })
                                .transacting(trx);
                            await transactionModel.table.insert({
                                ...transaction,
                                userId: user.userId,
                            }).transacting(trx);
                            await userModel.table
                                .where({ userId: user.userId })
                                .update({
                                cash: dbConnection.knex.raw(`cash + ${sum.toString()}`),
                            })
                                .transacting(trx);
                        }
                        catch (err) {
                            trx.rollback(err);
                        }
                    });
                    scheduleDroneUpdate(droneModel, droneInfo.droneId, droneInfo.period * 3600);
                    if (select && select.length > 0) {
                        res.status(201).json((await transactionModel.table.columns(select)
                            .where({
                            userId: user.userId,
                            droneId: transaction.droneId,
                        }).whereIn('transactionId', transactionModel.table.max('transactionId')))[0]);
                    }
                    else {
                        res.status(201).json({});
                    }
                }
                catch (err) {
                    next(err);
                }
            },
            async getTransaction(req, res, next) {
                try {
                    const user = req.user;
                    const transactionId = req.swagger.params.transactionId.value;
                    const select = req.swagger.params.select.value;
                    const hadUserId = select.includes('userId');
                    if (!hadUserId) {
                        select.push('userId');
                    }
                    const columns = util_service_1.getSelectAsColumns(select, table_names_1.TableName.Transactions);
                    let query;
                    if (user.role & users_model_1.UserRoles.OWNER) {
                        query = transactionModel.table
                            .join(table_names_1.TableName.Drones, `${table_names_1.TableName.Transactions}.droneId`, `${table_names_1.TableName.Drones}.droneId`)
                            .where(`${table_names_1.TableName.Drones}.ownerId`, user.userId);
                    }
                    else {
                        query = transactionModel.table.where('userId', user.userId);
                    }
                    const dronePriceData = await query.columns([
                        ...columns,
                        `${table_names_1.TableName.Drones}.ownerId as ownerId`,
                    ])
                        .where({ transactionId });
                    if (dronePriceData.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const droneInfo = dronePriceData[0];
                    if (!select || select.length === 0 || !hadUserId && select.length === 1) {
                        res.json(util_service_1.mapObject(droneInfo, select, table_names_1.TableName.Transactions));
                    }
                    else {
                        res.json(util_service_1.mapObject(droneInfo, hadUserId ? select : select.slice(0, -1), table_names_1.TableName.Transactions));
                    }
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
TransactionsController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.TransactionModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(3, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [transactions_model_1.TransactionsModel,
        users_model_1.UserModel,
        drones_model_1.DroneModel,
        db_connection_class_1.DbConnection])
], TransactionsController);
exports.TransactionsController = TransactionsController;
function restoreRentingSchedule() {
    const db = container_1.container.get(types_1.TYPES.DbConnection);
    const droneModel = container_1.container.get(types_1.TYPES.DroneModel);
    if (container_1.container.get(types_1.TYPES.DbConnection).config.client !== 'mysql') {
        throw new TypeError('Restoring renting queue is not supported for this DB driver (due to SQL dialect)');
    }
    const knex = db.knex;
    const update = (async () => {
        const dronesAlias = table_names_1.TableName.Drones.split('').reverse().join('');
        await knex.schema.raw(`CREATE TEMPORARY TABLE ${knex.raw('??', [dronesAlias])} ${knex(table_names_1.TableName.Drones)
            .columns([
            `${table_names_1.TableName.Drones}.droneId as droneId`,
        ])
            .join(table_names_1.TableName.Transactions, `${table_names_1.TableName.Drones}.droneId`, `${table_names_1.TableName.Transactions}.droneId`)
            .andWhere(`${table_names_1.TableName.Drones}.status`, drones_model_1.DroneStatus.RENTED)
            .whereRaw(`${knex.raw('??.??', [table_names_1.TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [table_names_1.TableName.Transactions, 'period'])} * 60 * 60) < now()`)}`);
        await knex(table_names_1.TableName.Drones)
            .whereIn('droneId', function () {
            this.column('droneId').from(dronesAlias);
        })
            .update({
            status: drones_model_1.DroneStatus.IDLE,
        });
        // knex.schema.raw(knex.raw('DROP VIEW ?? IF EXISTS', [dronesAlias]).toQuery()),
        await knex.schema.dropTable(dronesAlias);
    })();
    const select = knex(table_names_1.TableName.Transactions)
        .columns([
        `${table_names_1.TableName.Drones}.droneId as droneId`,
        knex.raw(`${knex.raw('??.??', [table_names_1.TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [table_names_1.TableName.Transactions, 'period'])} * 60 * 60) as ${knex.raw('??', ['timeout'])}`),
    ])
        .join(table_names_1.TableName.Drones, `${table_names_1.TableName.Transactions}.droneId`, `${table_names_1.TableName.Drones}.droneId`)
        .havingRaw(`${knex.raw('??', ['timeout'])} > NOW()`)
        .then((transactions) => {
        for (const { droneId, timeout } of transactions) {
            scheduleDroneUpdate(droneModel, droneId, timeout.getTime() - Date.now());
        }
    });
    return Promise.all([update, select]);
}
exports.restoreRentingSchedule = restoreRentingSchedule;
function isCustomerOnly(user) {
    return user.role & users_model_1.UserRoles.CUSTOMER
        && !(user.role & users_model_1.UserRoles.OWNER)
        && !(user.role & users_model_1.UserRoles.ADMIN);
}
function scheduleDroneUpdate(droneModel, droneId, timeout) {
    scheduler_service_1.scheduleTimer(() => {
        droneModel.update({ status: drones_model_1.DroneStatus.IDLE }, { droneId }).catch((err) => {
            console.error(err);
            console.error('renting stop failed');
        });
    }, timeout);
}
//# sourceMappingURL=transactions.controller.js.map