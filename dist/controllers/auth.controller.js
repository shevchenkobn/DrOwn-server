"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const users_model_1 = require("../models/users.model");
const authentication_class_1 = require("../services/authentication.class");
const error_service_1 = require("../services/error.service");
const bcrypt_1 = require("bcrypt");
const users_controller_1 = require("./users.controller");
let AuthController = class AuthController {
    constructor(userModel, jwt) {
        return {
            async getTokens(req, res, next) {
                try {
                    const { email, password } = req.swagger.params.user.value;
                    const users = await userModel.table.where({
                        email,
                    }).select();
                    if (users.length === 0 || !await bcrypt_1.compare(password, users[0].passwordHash)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD));
                        return;
                    }
                    const user = users[0];
                    let updateData = {};
                    if (!user.refreshToken) {
                        updateData = {
                            refreshTokenExpiration: jwt.getRefreshTokenExpiration(),
                            refreshToken: await jwt.getRefreshToken(user),
                        };
                        await userModel.table.where({
                            userId: user.userId,
                        }).update(updateData);
                    }
                    res.json({
                        accessToken: jwt.encode(user),
                        refreshToken: updateData.refreshToken || user.refreshToken,
                    });
                }
                catch (err) {
                    next(err);
                }
            },
            async refreshTokens(req, res, next) {
                try {
                    const { accessToken, refreshToken } = req.swagger.params.tokens.value;
                    const user = await jwt.getUserFromToken(accessToken, true);
                    if (refreshToken !== user.refreshToken) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD));
                        return;
                    }
                    const now = Date.now();
                    if (now >= user.refreshTokenExpiration.getTime()) {
                        await userModel.table.where({ userId: user.userId }).update({
                            refreshToken: null,
                            refreshTokenExpiration: null,
                        });
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_EXPIRED));
                        return;
                    }
                    // await userModel.table.where({
                    //   userId: user.userId,
                    // }).update({
                    //   refreshTokenExpiration: getRefreshTokenExpiration(),
                    // });
                    res.json({
                        refreshToken,
                        accessToken: jwt.encode(user),
                    });
                }
                catch (err) {
                    next(err);
                }
            },
            async registerUser(req, res, next) {
                try {
                    const inputUser = req.swagger.params.user.value;
                    const select = req.swagger.params.select.value;
                    // if (typeof inputUser.companyId === 'string') {
                    //   next(new LogicError(ErrorCode.USER_COMPANY_BAD));
                    //   return;
                    // }
                    if (inputUser.role & users_model_1.UserRoles.ADMIN || inputUser.role & users_model_1.UserRoles.MODERATOR) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_ROLE_BAD));
                        return;
                    }
                    await userModel.create(inputUser);
                    res.json((await userModel.select(users_controller_1.getColumns(select, true), { email: inputUser.email }))[0]);
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
AuthController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.AuthService)),
    tslib_1.__metadata("design:paramtypes", [users_model_1.UserModel,
        authentication_class_1.AuthService])
], AuthController);
exports.AuthController = AuthController;
//# sourceMappingURL=auth.controller.js.map