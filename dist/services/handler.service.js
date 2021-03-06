"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../di/types");
const users_model_1 = require("../models/users.model");
const error_service_1 = require("./error.service");
const container_1 = require("../di/container");
const jwt = container_1.container.get(types_1.TYPES.AuthService);
exports.authenticateBearer = async (req, securityDefinition, authorizationHeader, next) => {
    let user;
    try {
        user = await jwt.getUserFromString(authorizationHeader);
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_EXPIRED));
            return;
        }
        if (err instanceof error_service_1.LogicError) {
            next(err);
            return;
        }
        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_NO));
        return;
    }
    const roleNames = req.swagger.operation['x-security-scopes'];
    if (roleNames && roleNames.length >= 0) {
        const roles = roleNames.map((name) => users_model_1.UserRoles[name.toUpperCase()]);
        let hasRole = false;
        for (const role of roles) {
            if ((user.role & role) !== 0) {
                hasRole = true;
                break;
            }
        }
        if (!hasRole) {
            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
            return;
        }
    }
    req.user = user;
    next();
};
//# sourceMappingURL=handler.service.js.map