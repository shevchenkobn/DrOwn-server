"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const table_names_1 = require("../services/table-names");
var DroneRealtimeStatus;
(function (DroneRealtimeStatus) {
    DroneRealtimeStatus[DroneRealtimeStatus["WAITING"] = 0] = "WAITING";
    DroneRealtimeStatus[DroneRealtimeStatus["TAKING_CARGO"] = 1] = "TAKING_CARGO";
    DroneRealtimeStatus[DroneRealtimeStatus["RELEASING_CARGO"] = 2] = "RELEASING_CARGO";
    DroneRealtimeStatus[DroneRealtimeStatus["MOVING"] = 3] = "MOVING";
})(DroneRealtimeStatus = exports.DroneRealtimeStatus || (exports.DroneRealtimeStatus = {}));
let DroneMeasurementsModel = class DroneMeasurementsModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_names_1.TableName.DroneMeasurements);
    }
    save(deviceId, measurementInput) {
        const measurement = measurementInput;
        measurement.deviceId = deviceId;
        return this.table.insert(measurement);
    }
};
DroneMeasurementsModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], DroneMeasurementsModel);
exports.DroneMeasurementsModel = DroneMeasurementsModel;
function isDroneMeasurementInput(obj) {
    const isObj = (obj instanceof Object && typeof obj.status === 'number'
        && typeof obj.longitude === 'number' && typeof obj.latitude === 'number'
        && typeof obj.batteryCharge === 'number');
    return (isObj && obj.longitude >= -180 && obj.longitude <= 180
        && obj.latitude >= -90 && obj.latitude <= 90 && !!DroneRealtimeStatus[obj.status]);
}
exports.isDroneMeasurementInput = isDroneMeasurementInput;
//# sourceMappingURL=drone-measurements.model.js.map