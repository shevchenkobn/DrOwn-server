"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const graphql_1 = require("graphql");
const graphql_2 = require("graphql");
const graphql_3 = require("graphql");
const error_service_1 = require("../../services/error.service");
const graphql_tools_1 = require("graphql-tools");
const graphql_4 = require("graphql");
const DECIMAL_TYPE_NAME = 'Decimal';
exports.resolvers = {
    BigInt: new graphql_1.GraphQLScalarType({
        name: 'BigInt',
        description: 'A BigInt (64 bits) value in string that doesn\'t fit in JS Number type',
        parseValue(value) {
            return value;
        },
        serialize(value) {
            return value;
        },
        parseLiteral(ast) {
            if (ast.kind === graphql_2.Kind.STRING) {
                return ast.value;
            }
            throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
        },
    }),
    //  Decimal: new GraphQLScalarType({
    //    name: 'Decimal',
    //    description: 'A Decimal type (safe for storing floats) in string format',
    //    parseValue(value) {
    //      return value;
    //    },
    //    serialize(value) {
    //      return value;
    //    },
    //    parseLiteral(ast) {
    //      if (ast.kind === Kind.STRING) {
    //        return ast.value;
    //      }
    //      throw new LogicError(ErrorCode.GQL_VALUE_BAD);
    //    },
    //  }),
    decimal: new graphql_3.GraphQLDirective({
        name: 'decimal',
        description: 'A directive declaring precision of Decimal scalar',
        locations: ['INPUT_FIELD_DEFINITION', 'FIELD_DEFINITION'],
        args: {
            int: {
                type: graphql_3.GraphQLInt,
                description: 'Length of int part',
            },
            fraction: {
                type: graphql_3.GraphQLInt,
                description: 'Length of fraction part',
            },
        },
    }),
};
class ConstrainedDecimal extends graphql_1.GraphQLScalarType {
    constructor(type, regex) {
        super({
            name: DECIMAL_TYPE_NAME,
            parseValue(value) {
                const parsed = type.parseValue(value);
                if (typeof parsed === 'string' && regex.test(parsed)) {
                    return parsed;
                }
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
            },
            serialize(value) {
                return type.serialize(value);
            },
            parseLiteral(ast, ...args) {
                const parsed = type.parseLiteral(ast, ...args);
                if (typeof parsed === 'string' && regex.test(parsed)) {
                    return parsed;
                }
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
            },
        });
    }
}
exports.schemaDirectives = {
    decimal: class DecimalDirective extends graphql_tools_1.SchemaDirectiveVisitor {
        visitFieldDefinition(field) {
            if (!this.testType(field.type)) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_DIRECTIVE_TARGED);
            }
            const i = this.args.int;
            const f = this.args.fraction;
            const regex = new RegExp(`^\\d{1,${i}}(\\.\\d{0,${f})?'`);
            const { resolve = graphql_4.defaultFieldResolver } = field;
            field.resolve = async function (...args) {
                const result = await resolve.apply(this, args);
                if (typeof result === 'string' && regex.test(result)) {
                    return result;
                }
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_VALUE_BAD);
            };
        }
        visitInputFieldDefinition(field) {
            if (!this.testType(field.type)) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.GQL_DIRECTIVE_TARGED);
            }
            const i = this.args.int;
            const f = this.args.fraction;
            const regex = new RegExp(`^\\d{1,${i}}(\\.\\d{0,${f})?'`);
            // FIXME: Ensure it works as intended
            field.type = new ConstrainedDecimal(field.type, regex);
        }
        testType(type) {
            try {
                return (type.name === DECIMAL_TYPE_NAME
                    || type.ofType.name === DECIMAL_TYPE_NAME);
            }
            catch (err) {
                return false;
            }
        }
    },
};
//# sourceMappingURL=common.js.map