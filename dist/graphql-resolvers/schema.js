"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../di/types");
const users_model_1 = require("../models/users.model");
const container_1 = require("../di/container");
const bcrypt_1 = require("bcrypt");
const error_service_1 = require("../services/error.service");
const authentication_service_1 = require("../services/authentication.service");
const authentication_service_2 = require("../services/authentication.service");
const util_service_1 = require("../services/util.service");
const authentication_service_3 = require("../services/authentication.service");
const userModel = container_1.container.get(types_1.TYPES.UserModel);
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
            const user = await userModel.table.where({
                email,
            }).select();
            if (!await bcrypt_1.compare(password, user.passwordHash)) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            const accessToken = authentication_service_1.encodeJwt(user);
            const updateData = {
                refreshTokenExpiration: authentication_service_3.getRefreshTokenExpiration(),
            };
            if (!user.refreshToken) {
                updateData.refreshToken = await authentication_service_1.getRefreshToken(user);
            }
            await userModel.table.where({
                userId: user.userId,
            }).update(updateData);
            return {
                accessToken,
                refreshToken: updateData.refreshToken || user.refreshToken,
            };
        },
        registerUser(_, { userSeed }, ctx, info) {
            // FIXME: check optimized retrieval of specific fields
            return userModel.create(userSeed, true, util_service_1.getSelectColumns(info));
        },
        async getAccessToken(_, { refreshToken, accessToken }) {
            // NOTE: only 2 fields are retrieved, should be changed if auth algos changed
            const dbResult = await userModel.select(['userId', 'refreshTokenExpiration'], { refreshToken });
            if (!dbResult || dbResult.length === 0) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            const user = dbResult[0];
            const { userId, refreshTokenExpiration } = user;
            const now = Date.now();
            if (now >= refreshTokenExpiration.getTime()) {
                await userModel.table.where({ userId }).update({ refreshToken: null });
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_EXPIRED);
            }
            let decodedId;
            try {
                decodedId = authentication_service_2.decodeJwt(accessToken).id;
            }
            catch (err) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            if (userId !== decodedId) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
            }
            await userModel.table.where({
                userId,
            }).update({
                refreshTokenExpiration: authentication_service_3.getRefreshTokenExpiration(),
            });
            return {
                refreshToken,
                accessToken: authentication_service_1.encodeJwt(user),
            };
        },
    },
};
//# sourceMappingURL=schema.js.map