"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const http = require("http");
const url = require("url");
const SocketIOServer = require("socket.io");
const inversify_1 = require("inversify");
const drones_model_1 = require("../models/drones.model");
const error_service_1 = require("../services/error.service");
const util_service_1 = require("../services/util.service");
const drone_measurements_model_1 = require("../models/drone-measurements.model");
const drone_orders_model_1 = require("../models/drone-orders.model");
const db_connection_class_1 = require("../services/db-connection.class");
let SocketIoController = class SocketIoController {
    constructor(httpServer, droneModel, droneMeasurementModel, droneOrderModel, dbConnection) {
        this._httpServer = httpServer;
        this._droneModel = droneModel;
        this._droneOrderModel = droneOrderModel;
        this._droneMeasurementModel = droneMeasurementModel;
        this._dbConnection = dbConnection;
        this._socketIdToDeviceId = new Map();
        this._deviceIdToSocketId = new Map();
        this._devices = new Map();
        this._nsp = SocketIOServer(httpServer, {
            path: '/socket.io',
            serveClient: true,
        }).of('/drones');
        this._nsp.use(async (socket, fn) => {
            try {
                const req = socket.request;
                const { password, 'device-id': deviceId } = url.parse(req.url || '', true).query;
                if (!deviceId || !password || Array.isArray(deviceId) || Array.isArray(password)) {
                    fn(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_DEVICE_ID_PASSWORD));
                    return;
                }
                let drone = null;
                try {
                    drone = await droneModel.authenticateDrone(deviceId, password);
                }
                catch (err) {
                    fn(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD));
                    return;
                }
                if (drone.status !== drones_model_1.DroneStatus.OFFLINE) {
                    fn(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD));
                    return;
                }
                await droneModel.update({ status: drones_model_1.DroneStatus.IDLE }, { deviceId });
                // const socketId = getSocketId(socket);
                this._devices.set(deviceId, drone);
                this._socketIdToDeviceId.set(socket.id, deviceId);
                this._deviceIdToSocketId.set(deviceId, socket.id);
                fn();
            }
            catch (err) {
                console.error(err);
                fn(new error_service_1.LogicError(error_service_1.ErrorCode.SERVER)); // Send unknown error
            }
        });
        util_service_1.bindOnExitHandler(() => this._nsp.server.close());
        this.initialize();
    }
    listen(port) {
        return this._nsp.server.listen(port);
    }
    close(cb) {
        return this._nsp.server.close(cb);
    }
    disconnect(deviceId, safe = false) {
        const socketId = this._deviceIdToSocketId.get(deviceId);
        if (!socketId) {
            if (!safe) {
                throw new Error(`No connected device for ${deviceId}`);
            }
            return;
        }
        this._nsp.sockets[socketId].disconnect();
        console.debug(Object.keys(this._nsp.server.sockets));
    }
    sendOrder(order) {
        return new Promise((resolve, reject) => {
            const socketId = this._deviceIdToSocketId.get(order.deviceId);
            if (!socketId) {
                reject(new Error(`No connected device for ${order.deviceId}`));
                return;
            }
            if (!order.droneOrderId) {
                reject(new Error('No droneOrderId'));
                return;
            }
            const { deviceId, status, ...orderInfo } = order;
            this._nsp.sockets[socketId].emit('order', orderInfo, (status) => {
                if (!drone_orders_model_1.isOrderStatus(status)) {
                    reject(new Error(`Not a valid order acceptance status ${status}`));
                    return;
                }
                this.saveOrderStatus(orderInfo.droneOrderId, status, deviceId).then(() => {
                    resolve(status);
                }).catch(reject);
            });
        });
    }
    initialize() {
        this._nsp.on('connection', async (socket) => {
            socket.on('telemetry', async (data) => {
                if (!drone_measurements_model_1.isDroneMeasurementInput(data)) {
                    return;
                }
                const deviceId = this._socketIdToDeviceId.get(socket.id);
                if (!deviceId) {
                    return;
                }
                try {
                    await this._droneMeasurementModel.save(deviceId, data);
                }
                catch (err) {
                    console.error(err);
                }
            });
            socket.on('order-change', async (droneOrderId, status) => {
                const deviceId = this._socketIdToDeviceId.get(socket.id);
                if (!drone_orders_model_1.isOrderId(droneOrderId)) {
                    console.error(new Error(`Not a valid order id ${droneOrderId}`));
                    return;
                }
                if (!drone_orders_model_1.isOrderStatus(status)) {
                    console.error(new Error(`Not a valid order acceptance status ${status}`));
                    return;
                }
                try {
                    await this.saveOrderStatus(droneOrderId, status, deviceId);
                }
                catch (err) {
                    console.error(err);
                }
            });
            socket.on('disconnecting', async (reason) => {
                const deviceId = this._socketIdToDeviceId.get(socket.id);
                this._deviceIdToSocketId.delete(deviceId);
                this._devices.delete(deviceId);
                this._socketIdToDeviceId.delete(socket.id);
                this._droneModel.update({ status: drones_model_1.DroneStatus.OFFLINE }, { deviceId });
            });
        });
    }
    saveOrderStatus(droneOrderId, status, deviceId) {
        return this._dbConnection.knex.transaction(trx => {
            this._droneOrderModel.table
                .transacting(trx)
                .where({ droneOrderId })
                .update({ status }).then(affected => {
                if (affected === 0) {
                    trx.rollback(new Error(`Drone order with ${droneOrderId} id not found`));
                    return;
                }
                this._droneModel.table
                    .transacting(trx)
                    .where({ deviceId })
                    .update({
                    status: isIdleOrderStatus(status) ? drones_model_1.DroneStatus.IDLE : drones_model_1.DroneStatus.WORKING,
                }).then(affected => {
                    if (affected === 0) {
                        trx.rollback(new Error(`Drone with ${deviceId} device id not found`));
                        return;
                    }
                    trx.commit(true);
                });
            });
        });
    }
};
SocketIoController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.HttpServer)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.DroneMeasurementModel)),
    tslib_1.__param(3, inversify_1.inject(types_1.TYPES.DroneOrderModel)),
    tslib_1.__param(4, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [http.Server, drones_model_1.DroneModel,
        drone_measurements_model_1.DroneMeasurementsModel,
        drone_orders_model_1.DroneOrdersModel,
        db_connection_class_1.DbConnection])
], SocketIoController);
exports.SocketIoController = SocketIoController;
function isIdleOrderStatus(status) {
    return status !== drone_orders_model_1.DroneOrderStatus.ENQUEUED && status !== drone_orders_model_1.DroneOrderStatus.STARTED;
}
function getSocketId(socket) {
    return socket.id.includes('#') ? socket.id.split('#')[1] : socket.id;
}
//# sourceMappingURL=socket-io.controller.js.map