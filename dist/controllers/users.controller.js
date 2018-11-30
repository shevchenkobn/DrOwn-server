"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const users_model_1 = require("../models/users.model");
const invisibleFields = ['cash', 'address', 'longitude', 'latitude'];
let UsersController = class UsersController {
    constructor(userModel) {
        return {
            async getUsers(req, res, next) {
                try {
                    let select = req.swagger.params.select.value;
                    const user = req.user;
                    if (!(user.role & users_model_1.UserRoles.ADMIN
                        || user.role & users_model_1.UserRoles.MODERATOR)) {
                        select = select.filter(column => !invisibleFields.includes(column));
                    }
                    console.debug(select);
                    // TODO: add filters and sorting
                    res.json(await userModel.select(select));
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
UsersController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__metadata("design:paramtypes", [users_model_1.UserModel])
], UsersController);
exports.UsersController = UsersController;
//# sourceMappingURL=users.controller.js.map