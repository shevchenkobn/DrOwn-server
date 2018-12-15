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
var OrderAcceptance;
(function (OrderAcceptance) {
    OrderAcceptance[OrderAcceptance["STARTED"] = 0] = "STARTED";
    OrderAcceptance[OrderAcceptance["ERROR"] = 1] = "ERROR";
    OrderAcceptance[OrderAcceptance["ENQUEUED"] = 2] = "ENQUEUED";
})(OrderAcceptance = exports.OrderAcceptance || (exports.OrderAcceptance = {}));
let SocketIoController = class SocketIoController {
    constructor(httpServer, droneModel, droneMeasurementModel) {
        this._httpServer = httpServer;
        this._droneModel = droneModel;
        this._droneMeasurementModel = droneMeasurementModel;
        this._socketIdToDeviceId = new Map();
        this._deviceIdToSocketId = new Map();
        this._devices = new Map();
        this._server = SocketIOServer(httpServer, {
            path: '/socket.io',
            serveClient: true,
            origins: '*',
        });
        this._server.use(async (socket, fn) => {
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
                this._devices.set(deviceId, drone);
                this._socketIdToDeviceId.set(socket.id, deviceId);
                this._deviceIdToSocketId.set(deviceId, socket.id);
            }
            catch (err) {
                console.error(err);
                fn(new error_service_1.LogicError(error_service_1.ErrorCode.SERVER)); // Send unknown error
            }
        });
        util_service_1.bindCallbackOnExit(() => this._server.close());
        this.initialize();
    }
    listen(port) {
        return this._server.listen(port);
    }
    close(cb) {
        return this._server.close(cb);
    }
    disconnect(deviceId) {
        const socketId = this._deviceIdToSocketId.get(deviceId);
        if (!socketId) {
            throw new Error(`No connected device for ${deviceId}`);
        }
        this._server.sockets.connected[socketId].disconnect();
    }
    sendOrder(order) {
        return new Promise((resolve, reject) => {
            const socketId = this._deviceIdToSocketId.get(order.deviceId);
            if (!socketId) {
                reject(new Error(`No connected device for ${order.deviceId}`));
                return;
            }
            const { userId, deviceId, ...orderInfo } = order;
            this._server.sockets.connected[socketId].emit('order', orderInfo, (status) => {
                if (!isOrderAcceptance(status)) {
                    console.error(`Not a valid order acceptance status ${status}`);
                    return;
                }
                resolve(status);
            });
        });
    }
    initialize() {
        this._server.on('connection', async (socket) => {
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
                    console.log(err);
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
};
SocketIoController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.HttpServer)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.DroneMeasurementModel)),
    tslib_1.__metadata("design:paramtypes", [http.Server, drones_model_1.DroneModel,
        drone_measurements_model_1.DroneMeasurementsModel])
], SocketIoController);
exports.SocketIoController = SocketIoController;
function isOrderAcceptance(value) {
    return typeof value === 'number' && !!OrderAcceptance[value];
}
exports.isOrderAcceptance = isOrderAcceptance;
//# sourceMappingURL=socket-io.controller.js.map