"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const drones_model_1 = require("../models/drones.model");
const error_service_1 = require("../services/error.service");
const users_model_1 = require("../models/users.model");
const util_service_1 = require("../services/util.service");
const authentication_class_1 = require("../services/authentication.class");
const socket_io_controller_1 = require("../controllers/socket-io.controller");
let DronesController = class DronesController {
    constructor(droneModel, userModel, authService, socketIoController) {
        return {
            async getDrones(req, res, next) {
                try {
                    const user = req.user;
                    const producerIds = util_service_1.getSafeSwaggerParam(req, 'producer-ids');
                    const ownerIds = util_service_1.getSafeSwaggerParam(req, 'owner-ids');
                    const select = req.swagger.params.select.value;
                    const batteryPowerLimits = util_service_1.getSafeSwaggerParam(req, 'battery-power-limits');
                    if (batteryPowerLimits) {
                        batteryPowerLimits.sort();
                    }
                    const enginePowerLimits = util_service_1.getSafeSwaggerParam(req, 'engine-power-limits');
                    if (enginePowerLimits) {
                        enginePowerLimits.sort();
                    }
                    const loadCapacityLimits = util_service_1.getSafeSwaggerParam(req, 'load-capacity-limits');
                    const statuses = util_service_1.getSafeSwaggerParam(req, 'load-capacity-limits');
                    if (loadCapacityLimits) {
                        loadCapacityLimits.sort();
                    }
                    const canCarryLiquids = util_service_1.getSafeSwaggerParam(req, 'can-carry-liquids');
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'));
                    const query = droneModel.getOwnershipLimiterClause(user).columns(getColumns(select, true));
                    if (producerIds) { // TODO: Ensure it works properly
                        query.whereIn('producerId', producerIds);
                    }
                    if (ownerIds) { // TODO: Ensure it works properly
                        query.whereIn('ownerId', ownerIds);
                    }
                    if (batteryPowerLimits) {
                        query.andWhereBetween('batteryPower', batteryPowerLimits);
                    }
                    if (enginePowerLimits) {
                        query.andWhereBetween('enginePower', enginePowerLimits);
                    }
                    if (loadCapacityLimits) {
                        query.andWhereBetween('loadCapacity', loadCapacityLimits);
                    }
                    if (typeof canCarryLiquids === 'boolean') {
                        query.andWhere({ canCarryLiquids });
                    }
                    if (statuses) {
                        query.whereIn('status', statuses);
                    }
                    util_service_1.appendOrderBy(query, sortings);
                    console.debug(query.toSQL());
                    res.status(201).json(await query);
                }
                catch (err) {
                    next(err);
                }
            },
            async getDrone(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const droneId = req.swagger.params.droneId.value;
                    const hadOwnerId = select.includes('ownerId');
                    if (!hadOwnerId) {
                        select.push('ownerId');
                    }
                    const drones = await droneModel.select(select, { droneId });
                    if (drones.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const drone = drones[0];
                    if (drone.ownerId !== user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    if (!hadOwnerId) {
                        delete drone.ownerId;
                    }
                    res.json(drone);
                }
                catch (err) {
                    next(err);
                }
            },
            async createDrone(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const drone = req.swagger.params.drone.value;
                    checkLocation(drone);
                    drone.ownerId = user.userId;
                    if (typeof user.longitude !== 'number' && typeof drone.baseLongitude !== 'number') {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.LOCATION_BAD));
                        return;
                    }
                    if (typeof drone.baseLongitude !== 'number') {
                        drone.baseLongitude = user.longitude;
                        drone.baseLatitude = user.latitude;
                    }
                    await droneModel.create(drone);
                    res.json((await droneModel.select(getColumns(select, true), { deviceId: drone.deviceId }))[0]);
                }
                catch (err) {
                    next(err);
                }
            },
            async updateDrone(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const droneUpdate = req.swagger.params.drone.value;
                    const whereClause = getDroneWhereClause(req);
                    const returnDrone = select && select.length > 0;
                    const drones = await droneModel.select(['status', 'ownerId'], whereClause);
                    if (drones.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const droneFromDB = drones[0];
                    ensureCanBeModified(droneFromDB, user);
                    checkLocation(droneUpdate);
                    if (typeof droneUpdate.status === 'number') {
                        if (droneUpdate.status !== drones_model_1.DroneStatus.UNAUTHORIZED) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD));
                            return;
                        }
                        droneUpdate.passwordHash = null;
                    }
                    await droneModel.update(droneUpdate, whereClause);
                    if (returnDrone) {
                        res.json((await droneModel.select(select, whereClause))[0]);
                    }
                    else {
                        res.json({});
                    }
                }
                catch (err) {
                    next(err);
                }
            },
            async deleteDrone(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const whereClause = getDroneWhereClause(req);
                    let drone = null;
                    let deviceId;
                    let hadOwnerId = false;
                    let hadDeviceId = false;
                    if (select && select.length > 0) {
                        const columns = getColumns(select, true);
                        hadOwnerId = columns.includes('ownerId');
                        if (!hadOwnerId) {
                            columns.push('ownerId');
                        }
                        hadDeviceId = columns.includes('deviceId');
                        if (!hadDeviceId) {
                            columns.push('deviceId');
                        }
                        const drones = await droneModel.select(columns, whereClause);
                        if (drones.length === 0) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                            return;
                        }
                        drone = drones[0];
                        ensureCanBeModified(drone, user, false);
                        deviceId = drone.deviceId;
                    }
                    else {
                        const drones = await droneModel.select(['ownerId'], whereClause);
                        if (drones.length === 0) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                            return;
                        }
                        ensureCanBeModified(drones[0], user, false);
                        deviceId = drones[0].deviceId;
                    }
                    await droneModel.delete(whereClause);
                    socketIoController.disconnect(deviceId, true);
                    if (drone) {
                        if (!hadOwnerId) {
                            delete drone.ownerId;
                        }
                        if (!hadDeviceId) {
                            delete drone.deviceId;
                        }
                        res.json(drone);
                    }
                    else {
                        res.json({});
                    }
                }
                catch (err) {
                    next(err);
                }
            },
            async authorizeDrone(req, res, next) {
                try {
                    const deviceId = req.swagger.params['device-id'].value;
                    const drones = await droneModel.select(['status'], { deviceId });
                    if (drones.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    if (drones[0].status !== drones_model_1.DroneStatus.UNAUTHORIZED) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_AUTHORIZED));
                        return;
                    }
                    const password = util_service_1.getRandomString(drones_model_1.maxPasswordLength);
                    await droneModel.authorize({ deviceId }, password);
                    res.json({ deviceId, password });
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
DronesController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.AuthService)),
    tslib_1.__param(3, inversify_1.inject(types_1.TYPES.SocketIoController)),
    tslib_1.__metadata("design:paramtypes", [drones_model_1.DroneModel,
        users_model_1.UserModel,
        authentication_class_1.AuthService,
        socket_io_controller_1.SocketIoController])
], DronesController);
exports.DronesController = DronesController;
const safeColumns = [
    'droneId',
    'ownerId',
    'status',
    'batteryPower',
    'enginePower',
    'loadCapacity',
    'canCarryLiquids',
];
const adminFields = [
    'deviceId',
    'baseLatitude',
    'baseLongitude',
];
function getColumns(columns, includeAdmin) {
    if (!columns || columns.length === 0) {
        return (includeAdmin ? safeColumns.concat(adminFields) : safeColumns);
    }
    return columns.filter(column => safeColumns.includes(column)
        || includeAdmin && adminFields.includes(column));
}
function checkLocation(drone) {
    if ((typeof drone.baseLatitude !== 'number') !== (typeof drone.baseLongitude !== 'number')) {
        throw new error_service_1.LogicError(error_service_1.ErrorCode.LOCATION_BAD);
    }
}
function getDroneWhereClause(req) {
    const droneId = util_service_1.getSafeSwaggerParam(req, 'droneId');
    if (droneId) {
        return { droneId };
    }
    const deviceId = util_service_1.getSafeSwaggerParam(req, 'device-id');
    if (deviceId) {
        return { deviceId };
    }
    throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_ID_DRONE_DEVICE);
}
function ensureCanBeModified(drone, user, checkStatus = true) {
    if (drone.ownerId !== user.userId) {
        throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE);
    }
    if (checkStatus && (drone.status !== drones_model_1.DroneStatus.UNAUTHORIZED
        && drone.status !== drones_model_1.DroneStatus.OFFLINE)) {
        throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD);
    }
}
//# sourceMappingURL=drones.controller.js.map