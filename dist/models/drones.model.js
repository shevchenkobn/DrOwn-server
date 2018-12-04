"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const table_schemas_service_1 = require("../services/table-schemas.service");
const error_service_1 = require("../services/error.service");
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
        return this._knex(table_schemas_service_1.TableName.Drones);
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
            return await this.table.where(whereClause).insert(drone);
        }
        catch (err) {
            handleChangeError(err);
        }
    }
    delete(whereClause) {
        return this.table.where(whereClause).delete();
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