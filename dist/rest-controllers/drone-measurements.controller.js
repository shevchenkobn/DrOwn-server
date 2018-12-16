"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const util_service_1 = require("../services/util.service");
const drone_measurements_model_1 = require("../models/drone-measurements.model");
const drones_model_1 = require("../models/drones.model");
let DroneMeasurementsController = class DroneMeasurementsController {
    constructor(droneMeasurementsModel, droneModel) {
        return {
            async getMeasurements(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const deviceIds = util_service_1.getSafeSwaggerParam(req, 'device-ids');
                    const statuses = util_service_1.getSafeSwaggerParam(req, 'statuses');
                    const createdAtLimits = (util_service_1.getSafeSwaggerParam(req, 'created-at-limits') || []).map(dateStr => new Date(dateStr)).sort();
                    const longitudeLimits = util_service_1.getSafeSwaggerParam(req, 'longitude-limits');
                    const latitudeLimits = util_service_1.getSafeSwaggerParam(req, 'latitude-limits');
                    const batteryPowerLimits = util_service_1.getSafeSwaggerParam(req, 'battery-power-limits');
                    const batteryChargeLimits = util_service_1.getSafeSwaggerParam(req, 'battery-charge-limits');
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'));
                    const query = droneMeasurementsModel.table
                        .columns(select)
                        .whereIn('deviceId', droneModel.getOwnershipLimiterClause(user));
                    if (deviceIds) {
                        query.whereIn('deviceId', deviceIds);
                    }
                    if (statuses) {
                        query.whereIn('status', statuses);
                    }
                    if (batteryChargeLimits) {
                        query.andWhereBetween('batteryCharge', batteryChargeLimits);
                    }
                    if (batteryPowerLimits) {
                        query.andWhereBetween('batteryPower', batteryPowerLimits);
                    }
                    if (longitudeLimits) {
                        query.andWhereBetween('longitude', longitudeLimits);
                    }
                    if (latitudeLimits) {
                        query.andWhereBetween('latitude', latitudeLimits);
                    }
                    if (createdAtLimits.length > 0) {
                        query.andWhereBetween('createdAt', createdAtLimits);
                    }
                    util_service_1.appendOrderBy(query, sortings);
                    console.debug(query.toQuery());
                    res.json(await query);
                }
                catch (err) {
                    next(err);
                }
            },
            async deleteMeasurements(req, res, next) {
                try {
                    const user = req.user;
                    const deviceIds = util_service_1.getSafeSwaggerParam(req, 'device-ids');
                    const createdAtLimits = util_service_1.getSafeSwaggerParam(req, 'created-at-limits').map(dateStr => new Date(dateStr)).sort();
                    const query = droneMeasurementsModel.table
                        .whereIn('deviceId', droneModel.getOwnershipLimiterClause(user))
                        .whereIn('deviceId', deviceIds)
                        .andWhereBetween('createdAt', createdAtLimits)
                        .delete();
                    console.debug(query.toQuery());
                    await query;
                    res.json({});
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
DroneMeasurementsController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DroneMeasurementModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__metadata("design:paramtypes", [drone_measurements_model_1.DroneMeasurementsModel,
        drones_model_1.DroneModel])
], DroneMeasurementsController);
exports.DroneMeasurementsController = DroneMeasurementsController;
//# sourceMappingURL=drone-measurements.controller.js.map