"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
let DronesController = class DronesController {
    constructor() {
        types_1.TYPES;
    }
};
DronesController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__metadata("design:paramtypes", [])
], DronesController);
exports.DronesController = DronesController;
//# sourceMappingURL=drones.controller.js.map