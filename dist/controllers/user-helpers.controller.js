"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const users_model_1 = require("../models/users.model");
const inversify_1 = require("inversify");
let UserHelpersController = class UserHelpersController {
    constructor() {
        return {
            getUserRoles(req, res) {
                res.json(Object.keys(users_model_1.UserRoles).reduce((values, key) => {
                    if (!Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
                        return values;
                    }
                    values[key.toLowerCase()] = users_model_1.UserRoles[key];
                    return values;
                }, {}));
            },
            getUserStatuses(req, res) {
                res.json(Object.keys(users_model_1.UserStatus).reduce((values, key) => {
                    if (!Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
                        return values;
                    }
                    values[key.toLowerCase()] = users_model_1.UserStatus[key];
                    return values;
                }, {}));
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