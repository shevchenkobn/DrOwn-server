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
let DronesController = class DronesController {
    constructor(droneModel, userModel, authService) {
        return {
            async getDrones(req, res, next) {
                try {
                    let user = null;
                    try {
                        user = await authService.getUserFromRequest(req);
                    }
                    catch { }
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
                    const query = droneModel.table.columns(getColumns(select, !!user && (!!(user.role & users_model_1.UserRoles.ADMIN) || !!(ownerIds && ownerIds.length && ownerIds[0] === user.userId))));
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
                    console.debug(query.toSQL());
                    res.json(await query);
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
                    let ownerUser;
                    if (!drone.ownerId) {
                        if (!(user.role & users_model_1.UserRoles.OWNER)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_OWNER_NO));
                            return;
                        }
                        drone.ownerId = user.userId;
                        ownerUser = user;
                    }
                    else if (drone.ownerId !== user.userId) {
                        if (!(user.role & users_model_1.UserRoles.ADMIN)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                            return;
                        }
                        const columns = ['role'];
                        if (typeof drone.baseLongitude !== 'number' || typeof drone.baseLatitude !== 'number') {
                            columns.push('longitude', 'latitude');
                        }
                        const users = await userModel.select(columns, { userId: drone.ownerId });
                        if (users.length === 0 || !(users[0].role & users_model_1.UserRoles.OWNER)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_OWNER_BAD));
                            return;
                        }
                        ownerUser = users[0];
                    }
                    else {
                        ownerUser = user;
                    }
                    if (!drone.producerId) {
                        if (!(user.role & users_model_1.UserRoles.PRODUCER)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_PRODUCER_NO));
                            return;
                        }
                        drone.producerId = user.userId;
                    }
                    else if (drone.producerId !== user.userId) {
                        if (!(user.role & users_model_1.UserRoles.ADMIN)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                            return;
                        }
                        const users = await userModel.select(['role'], { userId: drone.producerId });
                        if (users.length === 0 || !(users[0].role & users_model_1.UserRoles.PRODUCER)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_OWNER_BAD));
                            return;
                        }
                    }
                    checkLocation(drone);
                    if (typeof drone.baseLongitude !== 'number') {
                        drone.baseLongitude = ownerUser.longitude;
                        drone.baseLatitude = ownerUser.latitude;
                    }
                    if (typeof drone.baseLongitude !== 'number') {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.LOCATION_BAD));
                        return;
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
                    if (droneUpdate.ownerId) {
                        if (!(user.role & users_model_1.UserRoles.ADMIN)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                            return;
                        }
                        const users = await userModel.select(['role'], { userId: droneUpdate.ownerId });
                        if (users.length === 0 || !(users[0].role & users_model_1.UserRoles.OWNER)) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_OWNER_BAD));
                            return;
                        }
                    }
                    if (user.status === users_model_1.UserStatus.BLOCKED && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_BLOCKED));
                        return;
                    }
                    const returnDrone = select && select.length > 0;
                    const columns = returnDrone ? getColumns(select, true) : [];
                    const hadStatus = columns.includes('status');
                    if (!hadStatus) {
                        columns.push('status');
                    }
                    const hadOwnerId = columns.includes('ownerId');
                    if (!hadOwnerId) {
                        columns.push('ownerId');
                    }
                    const drones = await droneModel.select(columns, whereClause);
                    if (drones.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const droneFromDB = drones[0];
                    if (!(user.role & users_model_1.UserRoles.ADMIN) && droneFromDB.ownerId !== user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    if (droneFromDB.status === drones_model_1.DroneStatus.UNAUTHORIZED) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_UNAUTHORIZED));
                        return;
                    }
                    if (droneFromDB.status === drones_model_1.DroneStatus.RENTED
                        && !('isWritingTelemetry' in droneFromDB
                            && Object.keys(droneFromDB).length === 1)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_RENTED));
                        return;
                    }
                    checkLocation(droneUpdate);
                    await droneModel.update(droneUpdate, whereClause);
                    if (returnDrone) {
                        if (!hadOwnerId) {
                            delete droneFromDB.ownerId;
                        }
                        if (!hadStatus) {
                            delete droneFromDB.status;
                        }
                        res.json(droneFromDB);
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
                    let hadOwnerId = false;
                    if (select && select.length > 0) {
                        const columns = getColumns(select, true);
                        if (!(user.role & users_model_1.UserRoles.ADMIN)) {
                            hadOwnerId = columns.includes('ownerId');
                            if (!hadOwnerId) {
                                columns.push('ownerId');
                            }
                            const drones = await droneModel.select(columns, whereClause);
                            if (drones.length === 0) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                                return;
                            }
                            drone = drones[0];
                            if (drone.ownerId !== user.userId) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                                return;
                            }
                        }
                        else {
                            const drones = await droneModel.select(columns, whereClause);
                            if (drones.length === 0) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                                return;
                            }
                            drone = drones[0];
                        }
                    }
                    else if (!(user.role & users_model_1.UserRoles.ADMIN)) {
                        const drones = await droneModel.select(['ownerId'], whereClause);
                        if (drones.length === 0) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                            return;
                        }
                        if (drones[0].ownerId !== user.userId) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                            return;
                        }
                    }
                    const affectedRows = await droneModel.delete(whereClause);
                    if (affectedRows === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    if (drone) {
                        if (!hadOwnerId) {
                            delete drone.ownerId;
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
        };
    }
};
DronesController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.AuthService)),
    tslib_1.__metadata("design:paramtypes", [drones_model_1.DroneModel,
        users_model_1.UserModel,
        authentication_class_1.AuthService])
], DronesController);
exports.DronesController = DronesController;
const safeColumns = [
    'droneId',
    'producerId',
    'ownerId',
    'deviceId',
    'status',
    'batteryPower',
    'enginePower',
    'loadCapacity',
    'canCarryLiquids',
];
const adminFields = [
    'baseLatitude',
    'baseLongitude',
    'isWritingTelemetry',
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
//# sourceMappingURL=drones.controller.js.map