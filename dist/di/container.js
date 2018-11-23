"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const users_model_1 = require("../models/users.model");
exports.container = new inversify_1.Container({
    defaultScope: 'Singleton',
});
exports.container.bind(types_1.TYPES.DbConnection).to(db_connection_class_1.DbConnection);
exports.container.bind(types_1.TYPES.UserModel).to(users_model_1.UserModel);
//# sourceMappingURL=container.js.map