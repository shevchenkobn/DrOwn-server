"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const users_model_1 = require("../models/users.model");
const authentication_class_1 = require("../services/authentication.class");
const user_helpers_controller_1 = require("../controllers/user-helpers.controller");
const users_controller_1 = require("../controllers/users.controller");
const auth_controller_1 = require("../controllers/auth.controller");
exports.container = new inversify_1.Container({
    defaultScope: 'Singleton',
});
const typeMap = new Map([
    [types_1.TYPES.DbConnection, db_connection_class_1.DbConnection],
    [types_1.TYPES.AuthService, authentication_class_1.AuthService],
    [types_1.TYPES.UserModel, users_model_1.UserModel],
    [types_1.TYPES.UserHelpersController, user_helpers_controller_1.UserHelpersController],
    [types_1.TYPES.AuthController, auth_controller_1.AuthController],
    [types_1.TYPES.UsersController, users_controller_1.UsersController],
]);
for (const [symbol, type] of typeMap) {
    exports.container.bind(symbol).to(type);
}
exports.initAsync = Promise.all([...typeMap.entries()]
    .filter(([, type]) => types_1.ASYNC_INIT in type)
    .map(([symbol]) => exports.container.get(symbol)[types_1.ASYNC_INIT]));
//# sourceMappingURL=container.js.map