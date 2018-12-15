"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const inversify_1 = require("inversify");
const util_service_1 = require("../services/util.service");
const drones_model_1 = require("../models/drones.model");
const drone_prices_model_1 = require("../models/drone-prices.model");
let DroneHelpersController = class DroneHelpersController {
    constructor() {
        return {
            getDroneStatuses(req, res) {
                res.json(util_service_1.enumToObject(drones_model_1.DroneStatus));
            },
            getDronePriceActionTypes(req, res) {
                res.json(util_service_1.enumToObject(drone_prices_model_1.DronePriceActionType));
            },
        };
    }
};
DroneHelpersController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__metadata("design:paramtypes", [])
], DroneHelpersController);
exports.DroneHelpersController = DroneHelpersController;
//# sourceMappingURL=drone-helpers.controller.js.map