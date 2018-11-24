"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_2 = require("graphql");
const error_service_1 = require("../../services/error.service");
const users_model_1 = require("../../models/users.model");
const graphql_3 = require("graphql");
const graphql_4 = require("graphql");
const users_model_2 = require("../../models/users.model");
const graphql_tools_1 = require("graphql-tools");
const UserRole = new graphql_4.GraphQLEnumType({
    name: 'UserRole',
    values: Object.keys(users_model_2.UserRoles).reduce((values, key) => {
        if (Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
            return values;
        }
        values[key] = {
            value: users_model_2.UserRoles[key],
        };
        return values;
    }, {}),
});
exports.resolvers = {
    UserRole,
    UserRoles: new graphql_1.GraphQLScalarType({
        name: 'UserRoles',
        description: 'A bitmask field describing user roles',
        parseValue(value) {
            if (users_model_1.isValidRole(value)) {
                return value;
            }
            throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
        },
        serialize(value) {
            return value;
        },
        parseLiteral(ast) {
            if (ast.kind === graphql_2.Kind.INT && users_model_1.isValidRole(ast.value)) {
                return ast.value;
            }
            throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
        },
    }),
    notRoles: new graphql_3.GraphQLDirective({
        name: 'notRoles',
        description: 'A directive prohibiting particular roles',
        locations: ['INPUT_FIELD_DEFINITION'],
        args: {
            roles: {
                type: new graphql_3.GraphQLList(UserRole),
                description: 'Roles to exclude',
            },
        },
    }),
};
class ConstrainedUserRoles extends graphql_1.GraphQLScalarType {
    constructor(type, excludeRoles) {
        super({
            name: 'ConstrainedDecimal',
            parseValue(value) {
                const parsed = type.parseValue(value);
                if (typeof parsed !== 'number') {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
                }
                let rolesAreGood = true;
                for (const role of excludeRoles) {
                    if (parsed & role) {
                        rolesAreGood = false;
                        break;
                    }
                }
                if (!rolesAreGood) {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
                }
                return parsed;
            },
            serialize(value) {
                return type.serialize(value);
            },
            parseLiteral(ast, ...args) {
                const parsed = type.parseLiteral(ast, ...args);
                if (typeof parsed !== 'number') {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
                }
                let rolesAreGood = true;
                for (const role of excludeRoles) {
                    if (parsed & role) {
                        rolesAreGood = false;
                        break;
                    }
                }
                if (!rolesAreGood) {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
                }
                return parsed;
            },
        });
    }
}
exports.schemaDirectives = {
    notRoles: class NotRolesDirective extends graphql_tools_1.SchemaDirectiveVisitor {
        visitInputFieldDefinition(field) {
            if (field.type !== exports.resolvers.UserRoles) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_DIRECTIVE_TARGED);
            }
            const excludeRoles = this.args.roles;
            // FIXME: Ensure it works as intended
            field.type = new ConstrainedUserRoles(field.type, excludeRoles);
        }
    },
};
//# sourceMappingURL=user.type.js.map