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
let SocketIoController = class SocketIoController {
    constructor(httpServer, droneModel, droneMeasurementModel, droneOrderModel) {
        this._httpServer = httpServer;
        this._droneModel = droneModel;
        this._droneOrderModel = droneOrderModel;
        this._droneMeasurementModel = droneMeasurementModel;
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
                const socketId = getSocketId(socket);
                this._devices.set(deviceId, drone);
                this._socketIdToDeviceId.set(socketId, deviceId);
                this._deviceIdToSocketId.set(deviceId, socketId);
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
        this._nsp.server.sockets.connected[socketId].disconnect();
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
            this._nsp.server.sockets.connected[socketId].emit('order', orderInfo, (status) => {
                if (!drone_orders_model_1.isOrderStatus(status)) {
                    reject(new Error(`Not a valid order acceptance status ${status}`));
                    return;
                }
                this.saveOrderStatus(deviceId, status).then((affected) => {
                    if (affected === 0) {
                        console.error(new Error(`No order in the database with id ${orderInfo.droneOrderId} and status ${drone_orders_model_1.DroneOrderStatus[status]}`));
                        return;
                    }
                    resolve(status);
                }).catch(reject);
            });
        });
    }
    initialize() {
        this._nsp.on('connection', async (socket) => {
            console.log(socket.id);
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
                if (!drone_orders_model_1.isOrderStatus(status)) {
                    console.error(new Error(`Not a valid order acceptance status ${status}`));
                    return;
                }
                try {
                    const affected = await this.saveOrderStatus(droneOrderId, status)
                        .andWhere('deviceId', deviceId);
                    if (affected === 0) {
                        console.error(new Error(`No order in the database with id ${droneOrderId} and status ${drone_orders_model_1.DroneOrderStatus[status]}`));
                    }
                }
                catch (err) {
                    console.error(err);
                }
            });
            socket.on('disconnecting', async (reason) => {
                const deviceId = this._socketIdToDeviceId.get(getSocketId(socket));
                this._deviceIdToSocketId.delete(deviceId);
                this._devices.delete(deviceId);
                this._socketIdToDeviceId.delete(socket.id);
                this._droneModel.update({ status: drones_model_1.DroneStatus.OFFLINE }, { deviceId });
            });
        });
    }
    saveOrderStatus(droneOrderId, status) {
        return this._droneOrderModel.table
            .where({ droneOrderId })
            .update({ status });
    }
};
SocketIoController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.HttpServer)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.DroneMeasurementModel)),
    tslib_1.__param(3, inversify_1.inject(types_1.TYPES.DroneOrderModel)),
    tslib_1.__metadata("design:paramtypes", [http.Server, drones_model_1.DroneModel,
        drone_measurements_model_1.DroneMeasurementsModel,
        drone_orders_model_1.DroneOrdersModel])
], SocketIoController);
exports.SocketIoController = SocketIoController;
function getSocketId(socket) {
    return socket.id.includes('#') ? socket.id.split('#')[1] : socket.id;
}
//# sourceMappingURL=socket-io.controller.js.map