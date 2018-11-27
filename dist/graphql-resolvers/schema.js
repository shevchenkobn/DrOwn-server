"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../di/types");
const users_model_1 = require("../models/users.model");
const container_1 = require("../di/container");
const bcrypt_1 = require("bcrypt");
const error_service_1 = require("../services/error.service");
const authentication_service_1 = require("../services/authentication.service");
const util_service_1 = require("../services/util.service");
const userModel = container_1.container.get(types_1.TYPES.UserModel);
const jwt = container_1.container.get(types_1.TYPES.JwtAuthorization);
exports.resolvers = {
    Query: {
        userRoles() {
            return users_model_1.UserRoles;
        },
        users(_, args, ctx, info) {
            // FIXME: check optimized retrieval of specific fields
            return userModel.select(util_service_1.getSelectColumns(info));
        },
    },
    Mutation: {
        async authenticate(_, { email, password }) {
            const users = await userModel.table.where({
                email,
            }).select();
            if (users.length === 0 || !await bcrypt_1.compare(password, users[0].passwordHash)) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            const user = users[0];
            const updateData = {
                refreshTokenExpiration: authentication_service_1.getRefreshTokenExpiration(),
            };
            if (!user.refreshToken) {
                updateData.refreshToken = await authentication_service_1.getRefreshToken(user);
            }
            await userModel.table.where({
                userId: user.userId,
            }).update(updateData);
            return {
                accessToken: jwt.encode(user),
                refreshToken: updateData.refreshToken || user.refreshToken,
            };
        },
        registerUser(_, { userSeed }, ctx, info) {
            // FIXME: check optimized retrieval of specific fields
            return userModel.create(userSeed, true, util_service_1.getSelectColumns(info));
        },
        async getAccessToken(_, { refreshToken }) {
            // NOTE: only 2 fields are retrieved, should be changed if auth algos changed
            const users = await userModel.table.where({ refreshToken }).select();
            if (!users || users.length === 0) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            const user = users[0];
            if (refreshToken !== user.refreshToken) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            const now = Date.now();
            if (now >= user.refreshTokenExpiration.getTime()) {
                await userModel.table.where({ userId: user.userId }).update({
                    refreshToken: null,
                    refreshTokenExpiration: null,
                });
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_EXPIRED);
            }
            await userModel.table.where({
                userId: user.userId,
            }).update({
                refreshTokenExpiration: authentication_service_1.getRefreshTokenExpiration(),
            });
            return {
                refreshToken,
                accessToken: jwt.encode(user),
            };
        },
    },
};
//# sourceMappingURL=schema.js.map