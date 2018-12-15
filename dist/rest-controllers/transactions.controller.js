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
const drone_prices_model_1 = require("../models/drone-prices.model");
const drones_model_1 = require("../models/drones.model");
const decimal_js_1 = require("decimal.js");
const db_connection_class_1 = require("../services/db-connection.class");
const scheduler_service_1 = require("../services/scheduler.service");
const container_1 = require("../di/container");
let TransactionsController = class TransactionsController {
    constructor(transactionModel, dronePriceModel, userModel, droneModel, dbConnection) {
        return {
            async getTransactions(req, res, next) {
                try {
                    const user = req.user;
                    const isCustomer = isCustomerOnly(user);
                    const select = req.swagger.params.select.value;
                    const transactionIds = util_service_1.getSafeSwaggerParam(req, 'transaction-ids');
                    const priceIds = util_service_1.getSafeSwaggerParam(req, 'price-ids');
                    const userIds = util_service_1.getSafeSwaggerParam(req, 'user-ids');
                    if (userIds && isCustomer) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const createdAtLimits = (util_service_1.getSafeSwaggerParam(req, 'created-at-limits') || []).map(dateStr => new Date(dateStr)).sort();
                    const periodLimits = util_service_1.getSafeSwaggerParam(req, 'period-limits');
                    const statuses = util_service_1.getSafeSwaggerParam(req, 'statuses');
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'), table_names_1.TableName.Transactions);
                    let query;
                    if (isCustomer) {
                        query = transactionModel.table.where('userId', user.userId).columns(select);
                        if (transactionIds) {
                            query.whereIn('transactionId', transactionIds);
                        }
                        if (priceIds) {
                            query.whereIn('priceId', priceIds);
                        }
                        if (createdAtLimits) {
                            query.andWhereBetween('createdAt', createdAtLimits);
                        }
                        if (periodLimits) {
                            query.andWhereBetween('period', periodLimits);
                        }
                        if (statuses) {
                            query.whereIn('status', statuses);
                        }
                        console.debug(query.toSQL());
                        res.json(await query);
                    }
                    else {
                        query = transactionModel.table
                            .join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Transactions}.priceId`, `${table_names_1.TableName.DronePrices}.priceId`).join(table_names_1.TableName.Drones, `${table_names_1.TableName.DronePrices}.droneId`, `${table_names_1.TableName.Drones}.droneId`);
                        if (user.role & users_model_1.UserRoles.CUSTOMER) {
                            query.andWhere(function () {
                                this.where(`${table_names_1.TableName.Drones}.ownerId`, user.userId)
                                    .orWhere(`${table_names_1.TableName.Transactions}.userId`, user.userId);
                            });
                        }
                        else {
                            query.andWhere(`${table_names_1.TableName.Drones}.ownerId`, user.userId);
                        }
                        if (transactionIds) {
                            query.whereIn(`${table_names_1.TableName.Transactions}.transactionId`, transactionIds);
                        }
                        if (priceIds) {
                            query.whereIn(`${table_names_1.TableName.Transactions}.priceId`, priceIds);
                        }
                        if (createdAtLimits) {
                            query.andWhereBetween(`${table_names_1.TableName.Transactions}.createdAt`, createdAtLimits);
                        }
                        if (periodLimits) {
                            query.andWhereBetween(`${table_names_1.TableName.Transactions}.period`, periodLimits);
                        }
                        if (statuses) {
                            query.whereIn(`${table_names_1.TableName.Transactions}.status`, statuses);
                        }
                    }
                    if (sortings) {
                        for (const [column, direction] of sortings) {
                            query.orderBy(column, direction);
                        }
                    }
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
                    const dronePriceData = await dronePriceModel.table.columns([
                        `${table_names_1.TableName.DronePrices}.actionType as actionType`,
                        `${table_names_1.TableName.DronePrices}.isActive as isActive`,
                        `${table_names_1.TableName.DronePrices}.price as price`,
                        `${table_names_1.TableName.Drones}.status as droneStatus`,
                        `${table_names_1.TableName.Drones}.ownerId as ownerId`,
                    ]).join(table_names_1.TableName.Drones, `${table_names_1.TableName.DronePrices}.droneId`, `${table_names_1.TableName.Drones}.droneId`).where({ priceId: transaction.priceId });
                    if (dronePriceData.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_PRICE_ID));
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
                    switch (droneInfo.actionType) {
                        case drone_prices_model_1.DronePriceActionType.RENTING: {
                            if (!(user.role & users_model_1.UserRoles.CUSTOMER)) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                                return;
                            }
                            if (typeof transaction.period !== 'number') {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_PERIOD));
                                return;
                            }
                            if (new decimal_js_1.Decimal(droneInfo.price).mul(transaction.period).greaterThan(user.cash)) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_CASH));
                                return;
                            }
                            break;
                        }
                        case drone_prices_model_1.DronePriceActionType.SELLING: {
                            if (!(user.role & users_model_1.UserRoles.OWNER)) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                                return;
                            }
                            if (typeof transaction.period === 'number') {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_PERIOD));
                                return;
                            }
                            if (new decimal_js_1.Decimal(droneInfo.price).greaterThan(user.cash)) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_CASH));
                                return;
                            }
                            break;
                        }
                    }
                    await transactionModel.table.insert({
                        ...transaction,
                        userId: user.userId,
                    });
                    if (select && select.length > 0) {
                        res.json((await transactionModel.table.columns(select)
                            .where({
                            userId: user.userId,
                            priceId: transaction.priceId,
                        }).whereIn('transactionId', transactionModel.table.max('transactionId')))[0]);
                    }
                    else {
                        res.json({});
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
                    const dronePriceData = await dronePriceModel.table.columns([
                        ...columns,
                        // `${TableName.DronePrices}.isActive as isActive`,
                        `${table_names_1.TableName.Drones}.ownerId as ownerId`,
                    ])
                        .join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Transactions}.priceId`, `${table_names_1.TableName.DronePrices}.priceId`)
                        .join(table_names_1.TableName.Drones, `${table_names_1.TableName.DronePrices}.droneId`, `${table_names_1.TableName.Drones}.droneId`)
                        .where({ transactionId });
                    if (dronePriceData.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const droneInfo = dronePriceData[0];
                    if (droneInfo.ownerId !== user.userId || droneInfo.userId !== user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    if (!select || select.length === 0 || !hadUserId && select.length === 1) {
                        res.json(util_service_1.mapObject(droneInfo, table_names_1.TableName.Transactions, select));
                    }
                    else {
                        res.json(util_service_1.mapObject(droneInfo, table_names_1.TableName.Transactions, hadUserId ? select : select.slice(0, -1)));
                    }
                }
                catch (err) {
                    next(err);
                }
            },
            async confirmTransaction(req, res, next) {
                try {
                    const user = req.user;
                    const transactionId = req.swagger.params.transactionId.value;
                    const select = req.swagger.params.select.value;
                    const dronePriceData = await dronePriceModel.table.columns([
                        `${table_names_1.TableName.Transactions}.status as status`,
                        `${table_names_1.TableName.Transactions}.period as period`,
                        `${table_names_1.TableName.Transactions}.userId as userId`,
                        // `${TableName.DronePrices}.isActive as isActive`,
                        `${table_names_1.TableName.DronePrices}.price as price`,
                        `${table_names_1.TableName.DronePrices}.actionType as actionType`,
                        `${table_names_1.TableName.DronePrices}.droneId as droneId`,
                        `${table_names_1.TableName.Drones}.status as droneStatus`,
                        `${table_names_1.TableName.Drones}.ownerId as ownerId`,
                    ]).join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Transactions}.priceId`, `${table_names_1.TableName.DronePrices}.priceId`).join(table_names_1.TableName.Drones, `${table_names_1.TableName.DronePrices}.droneId`, `${table_names_1.TableName.Drones}.droneId`).where({ transactionId });
                    if (dronePriceData.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const droneInfo = dronePriceData[0];
                    if (droneInfo.ownerId !== user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    if (droneInfo.status !== transactions_model_1.TransactionStatus.PENDING) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_STATUS_BAD));
                        return;
                    }
                    if (droneInfo.droneStatus !== drones_model_1.DroneStatus.IDLE) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD));
                        return;
                    }
                    switch (droneInfo.actionType) {
                        case drone_prices_model_1.DronePriceActionType.RENTING: {
                            const sum = new decimal_js_1.Decimal(droneInfo.price).mul(droneInfo.period);
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
                                    await userModel.table
                                        .where({ userId: user.userId })
                                        .update({
                                        cash: dbConnection.knex.raw(`cash + ${sum.toString()}`),
                                    })
                                        .transacting(trx);
                                    await transactionModel.table
                                        .update({ status: transactions_model_1.TransactionStatus.CONFIRMED })
                                        .where({ transactionId })
                                        .transacting(trx);
                                }
                                catch (err) {
                                    trx.rollback(err);
                                }
                            });
                            break;
                        }
                        case drone_prices_model_1.DronePriceActionType.SELLING: {
                            if (new decimal_js_1.Decimal(droneInfo.price).greaterThan(user.cash)) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_CASH));
                                return;
                            }
                            await dbConnection.knex.transaction(async (trx) => {
                                try {
                                    await userModel.table
                                        .where({ userId: droneInfo.userId })
                                        .update({
                                        cash: dbConnection.knex.raw(`cash - ${droneInfo.price}`),
                                    })
                                        .transacting(trx);
                                    await droneModel.table
                                        .where({ ownerId: droneInfo.userId })
                                        .update({ status: drones_model_1.DroneStatus.RENTED })
                                        .transacting(trx);
                                    scheduleDroneUpdate(droneModel, droneInfo.droneId, droneInfo.period * 3600);
                                    // scheduleTimer(() => {
                                    //   droneModel.update(
                                    //     { status: DroneStatus.IDLE },
                                    //     { droneId: droneInfo.droneId },
                                    //   ).catch((err) => {
                                    //     console.error(err);
                                    //     console.error('renting stop failed');
                                    //   });
                                    // }, droneInfo.period * 3600);
                                    await userModel.table
                                        .where({ userId: user.userId })
                                        .update({
                                        cash: dbConnection.knex.raw(`cash + ${droneInfo.price}`),
                                    })
                                        .transacting(trx);
                                    await transactionModel.table
                                        .update({ status: transactions_model_1.TransactionStatus.CONFIRMED })
                                        .where({ transactionId })
                                        .transacting(trx);
                                }
                                catch (err) {
                                    trx.rollback(err);
                                }
                            });
                            break;
                        }
                    }
                    if (select && select.length > 0) {
                        res.json((await transactionModel.select(select, { transactionId }))[0]);
                    }
                    else {
                        res.json({});
                    }
                }
                catch (err) {
                    next(err);
                }
            },
            async rejectTransaction(req, res, next) {
                try {
                    const user = req.user;
                    const transactionId = req.swagger.params.transactionId.value;
                    const select = req.swagger.params.select.value;
                    const dronePriceData = await dronePriceModel.table.columns([
                        `${table_names_1.TableName.Transactions}.status as status`,
                        `${table_names_1.TableName.Transactions}.userId as userId`,
                        // `${TableName.DronePrices}.isActive as isActive`,
                        `${table_names_1.TableName.Drones}.status as droneStatus`,
                        `${table_names_1.TableName.Drones}.ownerId as ownerId`,
                    ]).join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Transactions}.priceId`, `${table_names_1.TableName.DronePrices}.priceId`).join(table_names_1.TableName.Drones, `${table_names_1.TableName.DronePrices}.droneId`, `${table_names_1.TableName.Drones}.droneId`).where({ transactionId });
                    if (dronePriceData.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const droneInfo = dronePriceData[0];
                    if (droneInfo.ownerId !== user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    if (droneInfo.status !== transactions_model_1.TransactionStatus.PENDING) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.TRANSACTION_STATUS_BAD));
                        return;
                    }
                    if (droneInfo.droneStatus !== drones_model_1.DroneStatus.IDLE) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD));
                        return;
                    }
                    await transactionModel.table
                        .where({ transactionId })
                        .update({ status: transactions_model_1.TransactionStatus.REJECTED });
                    res.json((await transactionModel.select(select, { transactionId }))[0]);
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
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DronePriceModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__param(3, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(4, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [transactions_model_1.TransactionsModel,
        drone_prices_model_1.DronePricesModel,
        users_model_1.UserModel,
        drones_model_1.DroneModel,
        db_connection_class_1.DbConnection])
], TransactionsController);
exports.TransactionsController = TransactionsController;
function restoreRentingQueue() {
    return new Promise((resolve, reject) => {
        const db = container_1.container.get(types_1.TYPES.DbConnection);
        const droneModel = container_1.container.get(types_1.TYPES.DroneModel);
        if (container_1.container.get(types_1.TYPES.DbConnection).config.client !== 'mysql') {
            throw new TypeError('Restoring renting queue is not supported for this DB driver');
        }
        const knex = db.knex;
        const update = (async () => {
            const dronesAlias = table_names_1.TableName.Drones.split('').reverse().join('');
            await knex.schema.raw(`CREATE TEMPORARY TABLE ${knex.raw('??', [dronesAlias])} ${knex(table_names_1.TableName.Drones)
                .columns([
                `${table_names_1.TableName.Drones}.droneId as droneId`,
            ])
                .join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Drones}.droneId`, `${table_names_1.TableName.DronePrices}.droneId`)
                .join(table_names_1.TableName.Transactions, `${table_names_1.TableName.DronePrices}.priceId`, `${table_names_1.TableName.Transactions}.priceId`)
                .where(`${table_names_1.TableName.Transactions}.status`, transactions_model_1.TransactionStatus.CONFIRMED)
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
            `${table_names_1.TableName.DronePrices}.droneId as droneId`,
            knex.raw(`${knex.raw('??.??', [table_names_1.TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [table_names_1.TableName.Transactions, 'period'])} * 60 * 60) as ${knex.raw('??', ['timeout'])}`),
        ])
            .join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Transactions}.priceId`, `${table_names_1.TableName.DronePrices}.priceId`)
            .havingRaw(`${knex.raw('??', ['timeout'])} > NOW()`)
            .andWhere(`${table_names_1.TableName.Transactions}.status`, transactions_model_1.TransactionStatus.CONFIRMED)
            .then((transactions) => {
            for (const { droneId, timeout } of transactions) {
                scheduleDroneUpdate(droneModel, droneId, timeout.getTime() - Date.now());
            }
        });
        Promise.all([update, select]).then(() => resolve());
    });
}
exports.restoreRentingQueue = restoreRentingQueue;
function isCustomerOnly(user) {
    return user.role & users_model_1.UserRoles.CUSTOMER
        && !!(user.role & users_model_1.UserRoles.OWNER)
        && !!(user.role & users_model_1.UserRoles.LANDLORD);
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