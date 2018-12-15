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
    DroneOrderAction[DroneOrderAction["DELIVER"] = 4] = "DELIVER";
})(DroneOrderAction = exports.DroneOrderAction || (exports.DroneOrderAction = {}));
let DroneMeasurementsModel = class DroneMeasurementsModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_names_1.TableName.DroneOrders);
    }
};
DroneMeasurementsModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], DroneMeasurementsModel);
exports.DroneMeasurementsModel = DroneMeasurementsModel;
//# sourceMappingURL=drone-orders.model.js.map