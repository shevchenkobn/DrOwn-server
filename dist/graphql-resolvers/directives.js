"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const user_type_1 = require("./types/user.type");
const error_service_1 = require("../services/error.service");
exports.resolvers = {
    authorized: new graphql_1.GraphQLDirective({
        name: 'authorized',
        description: 'A directive managing roles and scopes',
        locations: [
            'QUERY',
            'MUTATION',
            'SUBSCRIPTION',
            'FIELD',
            'FRAGMENT_DEFINITION',
            'FRAGMENT_SPREAD',
            'INLINE_FRAGMENT',
            'SCHEMA',
            'SCALAR',
            'OBJECT',
            'FIELD_DEFINITION',
            'ARGUMENT_DEFINITION',
            'INTERFACE',
            'UNION',
            'ENUM',
            'ENUM_VALUE',
        ],
        args: {
            roles: {
                type: user_type_1.resolvers.UserRoles,
                description: 'Bitmask of allowed roles',
            },
        },
    }),
};
exports.directiveResolvers = {
    authorized: (next, source, { roles }, ctx) => {
        let user;
        try {
            // TODO: get user from context
            user = {};
        }
        catch (err) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_NO);
        }
        if (roles && roles.length > 0) {
            for (const role of roles) {
                if ((user.role & role) === 0) {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE);
                }
            }
        }
        next();
    },
};
//# sourceMappingURL=directives.js.map