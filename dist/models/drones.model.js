"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
var DroneStatus;
(function (DroneStatus) {
    DroneStatus[DroneStatus["IDLE"] = 1] = "IDLE";
    DroneStatus[DroneStatus["RENTED"] = 2] = "RENTED";
    DroneStatus[DroneStatus["OFFLINE"] = 3] = "OFFLINE";
})(DroneStatus = exports.DroneStatus || (exports.DroneStatus = {}));
let DroneModel = class DroneModel {
    constructor(dbConnection) {
    }
};
DroneModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], DroneModel);
exports.DroneModel = DroneModel;
//# sourceMappingURL=drones.model.js.map