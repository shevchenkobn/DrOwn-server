"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
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
    string(next, ...allArgs) {
        console.log(allArgs);
        next();
    },
};
class ConstrainedString extends graphql_1.GraphQLScalarType {
    constructor(type, maxLength, regex) {
        if (!maxLength && !regex) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_DIRECTIVE_ARGUMENT);
        }
        function validate(value) {
            if (typeof value !== 'string') {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
            }
            if (maxLength && value.length <= maxLength) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
            }
            if (regex && !regex.test(value)) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
            }
            return value;
        }
        super({
            name: 'String',
            serialize(value) {
                return type.serialize(value);
            },
            parseValue(value) {
                return type.parseValue(validate(type.serialize(value)));
            },
            parseLiteral(ast, ...args) {
                return validate(type.parseLiteral(ast, ...args));
            },
        });
    }
}
exports.schemaDirectives = {
// string: class StringDirective extends SchemaDirectiveVisitor {
//   visitInputFieldDefinition(field: GraphQLInputField) {
//     if (!this.testType(field.type)) {
//       throw new LogicError(ErrorCode.GQL_DIRECTIVE_TARGED);
//     }
//     const maxLength: number = this.args.maxLength || 0;
//     const regex: RegExp | undefined = typeof this.args.regex === 'string'
//       ? new RegExp(this.args.regex)
//       : void 0;
//
//     // FIXME: Ensure it works as intended
//     field.type = field.type instanceof GraphQLNonNull
//       ? new GraphQLNonNull(new ConstrainedString((field.type as any).ofType, maxLength, regex))
//       : new ConstrainedString(field.type as any, maxLength, regex);
//   }
//
//   visitArgumentDefinition(argument: GraphQLArgument) {
//     if (!this.testType(argument.type)) {
//       throw new LogicError(ErrorCode.GQL_DIRECTIVE_TARGED);
//     }
//     const maxLength: number = this.args.maxLength || 0;
//     const regex: RegExp | undefined = typeof this.args.regex === 'string'
//       ? new RegExp(this.args.regex)
//       : void 0;
//
//     // FIXME: Ensure it works as intended
//     argument.type = argument.type instanceof GraphQLNonNull
//       ? new GraphQLNonNull(new ConstrainedString((argument.type as any).ofType, maxLength, regex))
//       : new ConstrainedString(argument.type as any, maxLength, regex);
//   }
//
//   testType(type: any) {
//     try {
//       return (
//         type.name === 'String'
//         || type.ofType.name === 'String'
//       );
//     } catch {
//       return false;
//     }
//   }
// },
};
//# sourceMappingURL=directives.js.map