"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const users_model_1 = require("../models/users.model");
const error_service_1 = require("../services/error.service");
const authentication_service_1 = require("../services/authentication.service");
exports.resolvers = {
// authorized: new GraphQLDirective({
//   name: 'authorized',
//   description: 'A directive managing roles and scopes',
//   locations: [
//     'QUERY',
//     'MUTATION',
//     'SUBSCRIPTION',
//     'FIELD',
//     'FRAGMENT_DEFINITION',
//     'FRAGMENT_SPREAD',
//     'INLINE_FRAGMENT',
//     'SCHEMA',
//     'SCALAR',
//     'OBJECT',
//     'FIELD_DEFINITION',
//     'ARGUMENT_DEFINITION',
//     'INTERFACE',
//     'UNION',
//     'ENUM',
//     'ENUM_VALUE',
//   ],
//   args: {
//     roles: {
//       type: userResolvers.UserRoles,
//       description: 'Bitmask of allowed roles',
//     },
//   },
// }),
};
exports.directiveResolvers = {
    authorized: async (next, source, { roles: roleNames }, ctx) => {
        let user;
        if (typeof ctx.user === 'object') {
            user = ctx.user;
        }
        else {
            try {
                user = await authentication_service_1.getUserFromRequest(ctx.req);
            }
            catch (err) {
                if (err.name === 'TokenExpiredError') {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_EXPIRED);
                }
                throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_NO);
            }
            ctx.user = user;
        }
        if (roleNames && roleNames.length > 0) {
            const roles = roleNames.map((name) => users_model_1.UserRoles[name]);
            for (const role of roles) {
                if ((user.role & role) !== 0) {
                    next();
                    return;
                }
            }
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE);
        }
        next();
    },
};
//# sourceMappingURL=directives.js.map