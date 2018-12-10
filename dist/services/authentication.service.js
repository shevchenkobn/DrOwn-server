"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../di/types");
const autobahn_1 = require("autobahn");
const container_1 = require("../di/container");
const drones_model_1 = require("../models/drones.model");
const error_service_1 = require("./error.service");
const config = require("config");
const autobahnConfig = config.get('autobahn');
const droneModel = container_1.container.get(types_1.TYPES.DroneModel);
let selfConnected = false;
exports.autobahnAuth = {
    async authenticate([realm, authId, details]) {
        if (authId === autobahnConfig.authRPC.authId) {
            if (selfConnected) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            return { secret: autobahnConfig.authRPC.authId, role: autobahnConfig.authRPC.authId };
        }
        const drones = await droneModel.select(['status', 'passwordHash'], { deviceId: authId });
        if (drones.length === 0) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND);
        }
        if (drones[0].status === drones_model_1.DroneStatus.UNAUTHORIZED) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_UNAUTHORIZED);
        }
        if (drones[0].status !== drones_model_1.DroneStatus.OFFLINE) {
            // TODO: logging
            console.error('Duplicate login for drone');
            throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD);
        }
        return { secret: drones[0].passwordHash, role: autobahnConfig.authRPC.droneRole };
    },
    onChallenge(session, method, extra) {
        if (method !== 'wampcra') {
            throw new TypeError('undefined wamp auth method');
        }
        selfConnected = true;
        return autobahn_1.auth_cra.sign(autobahnConfig.authRPC.authId, extra.challenge);
    },
};
//# sourceMappingURL=authentication.service.js.map