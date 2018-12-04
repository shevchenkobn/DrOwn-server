"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const users_model_1 = require("../models/users.model");
const inversify_1 = require("inversify");
const util_service_1 = require("../services/util.service");
let UserHelpersController = class UserHelpersController {
    constructor() {
        return {
            getUserRoles(req, res) {
                res.json(util_service_1.enumToObject(users_model_1.UserRoles));
            },
            getUserStatuses(req, res) {
                res.json(util_service_1.enumToObject(users_model_1.UserStatus));
            },
        };
    }
};
UserHelpersController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__metadata("design:paramtypes", [])
], UserHelpersController);
exports.UserHelpersController = UserHelpersController;
//# sourceMappingURL=user-helpers.controller.js.map