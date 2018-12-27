"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const drone_orders_model_1 = require("../models/drone-orders.model");
const util_service_1 = require("../services/util.service");
const drones_model_1 = require("../models/drones.model");
const error_service_1 = require("../services/error.service");
const socket_io_controller_1 = require("../controllers/socket-io.controller");
let DroneOrdersController = class DroneOrdersController {
    constructor(droneOrderModel, droneModel, socketIoController) {
        return {
            async getDroneOrders(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const droneOrderIds = util_service_1.getSafeSwaggerParam(req, 'drone-order-ids');
                    const deviceIds = util_service_1.getSafeSwaggerParam(req, 'device-ids');
                    const userIds = util_service_1.getSafeSwaggerParam(req, 'user-ids');
                    const actions = util_service_1.getSafeSwaggerParam(req, 'actions');
                    const statuses = util_service_1.getSafeSwaggerParam(req, 'statuses');
                    const createdAtLimits = (util_service_1.getSafeSwaggerParam(req, 'created-at-limits') || []).map(dateStr => new Date(dateStr)).sort();
                    const longitudeLimits = util_service_1.getSafeSwaggerParam(req, 'longitude-limits');
                    const latitudeLimits = util_service_1.getSafeSwaggerParam(req, 'latitude-limits');
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'));
                    const query = droneOrderModel.table
                        .columns(select)
                        .whereIn('deviceId', droneModel.getOwnershipLimiterClause(user));
                    if (droneOrderIds) {
                        query.whereIn('deviceOrderId', droneOrderIds);
                    }
                    if (deviceIds) {
                        query.whereIn('deviceId', deviceIds);
                    }
                    if (userIds) {
                        query.whereIn('userId', userIds);
                    }
                    if (actions) {
                        query.whereIn('action', actions);
                    }
                    if (statuses) {
                        query.whereIn('status', statuses);
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
            async sendOrder(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const droneOrder = req.swagger.params.select.value;
                    if (droneOrder.action !== drone_orders_model_1.DroneOrderAction.MOVE_TO_LOCATION
                        && (typeof droneOrder.latitude === 'number'
                            || typeof droneOrder.longitude === 'number')) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_ORDER_ACTION_BAD));
                        return;
                    }
                    if (droneOrder.action === drone_orders_model_1.DroneOrderAction.MOVE_TO_LOCATION
                        && !(typeof droneOrder.latitude === 'number'
                            && typeof droneOrder.longitude === 'number')) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.LOCATION_BAD));
                        return;
                    }
                    const drones = await droneModel.getOwnershipLimiterClause(user)
                        .columns('deviceId', 'status')
                        .where('deviceId', droneOrder.deviceId);
                    if (drones.length !== 1) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    if (drones[0].status === drones_model_1.DroneStatus.UNAUTHORIZED) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_UNAUTHORIZED));
                        return;
                    }
                    if (drones[0].status === drones_model_1.DroneStatus.OFFLINE) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD));
                        return;
                    }
                    droneOrder.userId = user.userId;
                    await droneOrderModel.table.insert(droneOrder);
                    socketIoController.sendOrder(droneOrder).catch(err => {
                        console.log('didn\'t send order:', droneOrder);
                    });
                    if (select && select.length > 0) {
                        res.status(201).json((await droneOrderModel.table.columns(select)
                            .where('deviceId', droneOrder.deviceId)
                            .andWhere('userId', droneOrder.userId)
                            .whereIn('createdAt', function () {
                            this
                                .max('createdAt')
                                .where('deviceId', droneOrder.deviceId)
                                .andWhere('userId', droneOrder.userId);
                        }))[0]);
                    }
                    else {
                        res.status(201).json({});
                    }
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
DroneOrdersController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DroneOrderModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.SocketIoController)),
    tslib_1.__metadata("design:paramtypes", [drone_orders_model_1.DroneOrdersModel,
        drones_model_1.DroneModel,
        socket_io_controller_1.SocketIoController])
], DroneOrdersController);
exports.DroneOrdersController = DroneOrdersController;
//# sourceMappingURL=drone-orders.controller.js.map