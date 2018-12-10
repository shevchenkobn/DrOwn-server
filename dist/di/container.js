"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const users_model_1 = require("../models/users.model");
const authentication_class_1 = require("../services/authentication.class");
const user_helpers_controller_1 = require("../model-controllers/user-helpers.controller");
const users_controller_1 = require("../model-controllers/users.controller");
const auth_controller_1 = require("../model-controllers/auth.controller");
const drones_model_1 = require("../models/drones.model");
const drones_controller_1 = require("../model-controllers/drones.controller");
const drone_helpers_controller_1 = require("../model-controllers/drone-helpers.controller");
const autobahn_controller_1 = require("../controllers/autobahn.controller");
const config = require("config");
exports.container = new inversify_1.Container({
    defaultScope: 'Singleton',
});
const typeMap = new Map([
    [types_1.TYPES.DbConnection, db_connection_class_1.DbConnection],
    [types_1.TYPES.AuthService, authentication_class_1.AuthService],
    [types_1.TYPES.UserModel, users_model_1.UserModel],
    [types_1.TYPES.DroneModel, drones_model_1.DroneModel],
    [types_1.TYPES.UserHelpersController, user_helpers_controller_1.UserHelpersController],
    [types_1.TYPES.AuthController, auth_controller_1.AuthController],
    [types_1.TYPES.UsersController, users_controller_1.UsersController],
    [types_1.TYPES.DronesController, drones_controller_1.DronesController],
    [types_1.TYPES.DroneHelpersController, drone_helpers_controller_1.DroneHelpersController],
    [types_1.TYPES.AutobahnController, autobahn_controller_1.AutobahnController],
]);
exports.container.bind(types_1.TYPES.ServerConfig).toConstantValue(config.get('server'));
for (const [symbol, type] of typeMap) {
    exports.container.bind(symbol).to(type);
}
let initPromise = null;
function initAsync() {
    if (initPromise) {
        return initPromise;
    }
    initPromise = Promise.all([...typeMap.entries()]
        .filter(([, type]) => types_1.ASYNC_INIT in type)
        .map(([symbol]) => exports.container.get(symbol)[types_1.ASYNC_INIT]));
    return initPromise;
}
exports.initAsync = initAsync;
//# sourceMappingURL=container.js.map