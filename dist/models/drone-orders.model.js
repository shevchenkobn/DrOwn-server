"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const table_names_1 = require("../services/table-names");
var DroneOrderAction;
(function (DroneOrderAction) {
    DroneOrderAction[DroneOrderAction["STOP_AND_WAIT"] = 0] = "STOP_AND_WAIT";
    DroneOrderAction[DroneOrderAction["MOVE_TO_LOCATION"] = 1] = "MOVE_TO_LOCATION";
    DroneOrderAction[DroneOrderAction["TAKE_CARGO"] = 2] = "TAKE_CARGO";
    DroneOrderAction[DroneOrderAction["RELEASE_CARGO"] = 3] = "RELEASE_CARGO";
})(DroneOrderAction = exports.DroneOrderAction || (exports.DroneOrderAction = {}));
var DroneOrderStatus;
(function (DroneOrderStatus) {
    DroneOrderStatus[DroneOrderStatus["STARTED"] = 0] = "STARTED";
    DroneOrderStatus[DroneOrderStatus["ERROR"] = 1] = "ERROR";
    DroneOrderStatus[DroneOrderStatus["ENQUEUED"] = 2] = "ENQUEUED";
    DroneOrderStatus[DroneOrderStatus["SKIPPED"] = 3] = "SKIPPED";
    DroneOrderStatus[DroneOrderStatus["DONE"] = 4] = "DONE";
    DroneOrderStatus[DroneOrderStatus["TOO_FAR_GEO"] = 5] = "TOO_FAR_GEO";
})(DroneOrderStatus = exports.DroneOrderStatus || (exports.DroneOrderStatus = {}));
let DroneOrdersModel = class DroneOrdersModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_names_1.TableName.DroneOrders);
    }
    select(columns, where) {
        const query = where ? this.table.where(where) : this.table;
        return query.select(columns);
    }
};
DroneOrdersModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], DroneOrdersModel);
exports.DroneOrdersModel = DroneOrdersModel;
function isOrderStatus(value) {
    return typeof value === 'number' && !!DroneOrderStatus[value];
}
exports.isOrderStatus = isOrderStatus;
//# sourceMappingURL=drone-orders.model.js.map