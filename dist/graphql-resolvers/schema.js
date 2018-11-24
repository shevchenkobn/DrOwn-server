"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../di/types");
const users_model_1 = require("../models/users.model");
const container_1 = require("../di/container");
const bcrypt_1 = require("bcrypt");
const error_service_1 = require("../services/error.service");
const userModel = container_1.container.get(types_1.TYPES.UserModel);
exports.resolvers = {
    Query: {
        userRoles() {
            return users_model_1.UserRoles;
        },
        async users(_, args) {
            return userModel.select(); // FIXME: optimize retrieval of
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
            // const accessToken = jwt.sign({
            //   id: user.userId,
            // })
        },
        registerUser(_, { userSeed }) {
        },
    },
};
//# sourceMappingURL=schema.js.map