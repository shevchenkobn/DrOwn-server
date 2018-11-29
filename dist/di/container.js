"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const users_model_1 = require("../models/users.model");
const authentication_class_1 = require("../services/authentication.class");
const user_roles_controller_1 = require("../controllers/user-roles.controller");
exports.container = new inversify_1.Container({
    defaultScope: 'Singleton',
});
const typeMap = new Map([
    [types_1.TYPES.DbConnection, db_connection_class_1.DbConnection],
    [types_1.TYPES.JwtAuthorization, authentication_class_1.JwtAuthetication],
    [types_1.TYPES.UserModel, users_model_1.UserModel],
    [types_1.TYPES.UserRolesController, user_roles_controller_1.UserRolesController],
]);
for (const [symbol, type] of typeMap) {
    exports.container.bind(symbol).to(type);
}
exports.initAsync = Promise.all([...typeMap.entries()]
    .map(([symbol]) => exports.container.get(symbol))
    .filter(instance => types_1.ASYNC_INIT in instance)
    .map(instance => instance[types_1.ASYNC_INIT]));
//# sourceMappingURL=container.js.map