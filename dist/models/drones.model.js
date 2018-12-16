"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const table_names_1 = require("../services/table-names");
const error_service_1 = require("../services/error.service");
const bcrypt_1 = require("bcrypt");
exports.maxPasswordLength = 72 - 29;
var DroneStatus;
(function (DroneStatus) {
    DroneStatus[DroneStatus["UNAUTHORIZED"] = 0] = "UNAUTHORIZED";
    DroneStatus[DroneStatus["IDLE"] = 1] = "IDLE";
    DroneStatus[DroneStatus["RENTED"] = 2] = "RENTED";
    DroneStatus[DroneStatus["OFFLINE"] = 3] = "OFFLINE";
})(DroneStatus = exports.DroneStatus || (exports.DroneStatus = {}));
let DroneModel = class DroneModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_names_1.TableName.Drones);
    }
    select(columns, where) {
        const query = where ? this.table.where(where) : this.table;
        return query.select(columns);
    }
    async create(drone) {
        try {
            return await this.table.insert(drone);
        }
        catch (err) {
            handleChangeError(err);
        }
    }
    async update(drone, whereClause) {
        try {
            return await this.table.where(whereClause).update(drone);
        }
        catch (err) {
            handleChangeError(err);
        }
    }
    delete(whereClause) {
        return this.table.where(whereClause).delete();
    }
    async authorize(whereClause, password) {
        if (password.length > exports.maxPasswordLength) {
            throw new Error('Password is too long');
        }
        const passwordHash = await bcrypt_1.hash(password, 13);
        return await this.update({
            passwordHash,
            status: DroneStatus.OFFLINE,
        }, whereClause);
    }
    async authenticateDrone(deviceId, password, columns) {
        const hadPassword = !columns || columns.length === 0 || columns.includes('passwordHash');
        const select = !columns || columns.length === 0 ? [] : columns.slice();
        if (!hadPassword) {
            select.push('passwordHash');
        }
        const drones = await this.select(select, { deviceId });
        if (drones.length === 0 || !await bcrypt_1.compare(password, drones[0].passwordHash)) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
        }
        if (!hadPassword) {
            select.pop();
            delete drones[0].passwordHash;
        }
        return drones[0];
    }
    getOwnershipLimiterClause(user) {
        const knex = this._connection.knex;
        return this.table
            .column(`${table_names_1.TableName.Drones}.deviceId as deviceId`)
            .join(table_names_1.TableName.DronePrices, `${table_names_1.TableName.Drones}.droneId`, `${table_names_1.TableName.DronePrices}.droneId`)
            .join(table_names_1.TableName.Transactions, `${table_names_1.TableName.DronePrices}.priceId`, `${table_names_1.TableName.Transactions}.priceId`)
            .andWhere(function () {
            this
                .andWhere(`${table_names_1.TableName.Drones}.ownerId`, user.userId)
                .orWhere(function () {
                this
                    .where(`${table_names_1.TableName.Drones}.status`, DroneStatus.RENTED)
                    .andWhere(`${table_names_1.TableName.Transactions}.userId`, user.userId)
                    .andWhereRaw(`${knex.raw('??.??', [table_names_1.TableName.Transactions, 'createdAt'])} + SEC_TO_TIME(${knex.raw('??.??', [table_names_1.TableName.Transactions, 'period'])} * 60 * 60) >= now()`);
            });
        });
    }
};
DroneModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], DroneModel);
exports.DroneModel = DroneModel;
function handleChangeError(err) {
    switch (err.errno) {
        case 1062:
            // TODO: investigate if caught correctly
            throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_DEVICE_ID_BAD);
        case 1452:
            // TODO: investigate if caught correctly
            if (err.message.includes('ownerId')) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_OWNER_BAD);
            }
            else if (err.message.includes('producerId')) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_PRODUCER_BAD);
            }
    }
    console.log('change user error: ', err);
    throw new error_service_1.LogicError(error_service_1.ErrorCode.SERVER);
}
//# sourceMappingURL=drones.model.js.map