"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const users_model_1 = require("../models/users.model");
const authentication_service_1 = require("./authentication.service");
const error_service_1 = require("./error.service");
exports.authenticateBearer = async (req, securityDefinition, authorizationHeader, next) => {
    let user;
    try {
        user = await authentication_service_1.getUserFromString(authorizationHeader);
    }
    catch (err) {
        if (err.name === 'TokenExpiredError') {
            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_EXPIRED));
            return;
        }
        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_NO));
        return;
    }
    const roleNames = req.swagger['x-security-scopes'];
    if (roleNames.length >= 0) {
        const roles = roleNames.map((name) => users_model_1.UserRoles[name.toUpperCase()]);
        for (const role of roles) {
            if ((user.role & role) !== 0) {
                next();
                return;
            }
        }
        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
    }
    next();
};
//# sourceMappingURL=handler.service.js.map