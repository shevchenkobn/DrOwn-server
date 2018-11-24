import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql';
import { GraphQLDirective, GraphQLInt } from 'graphql';
import { GraphQLField } from 'graphql';
import { ErrorCode, LogicError } from '../../services/error.service';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { defaultFieldResolver } from 'graphql';
import { GraphQLInputField } from 'graphql';
import { GraphQLScalarTypeConfig } from 'graphql';

export const resolvers = {
  BigInt: new GraphQLScalarType({
    name: 'BigInt',
    description: 'A BigInt (64 bits) value in string that doesn\'t fit in JS Number type',
    parseValue(value) {
      return value;
    },
    serialize(value) {
      return value;
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return ast.value;
      }
      throw new LogicError(ErrorCode.GQL_VALUE_BAD);
    },
  }),

  Decimal: new GraphQLScalarType({
    name: 'Decimal',
    description: 'A Decimal type (safe for storing floats) in string format',
    parseValue(value) {
      return value;
    },
    serialize(value) {
      return value;
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.STRING) {
        return ast.value;
      }
      throw new LogicError(ErrorCode.GQL_VALUE_BAD);
    },
  }),

  decimal: new GraphQLDirective({
    name: 'decimal',
    description: 'A directive declaring precision of Decimal scalar',
    locations: ['INPUT_FIELD_DEFINITION', 'FIELD_DEFINITION'],
    args: {
      int: {
        type: GraphQLInt,
        description: 'Length of int part',
      },
      fraction: {
        type: GraphQLInt,
        description: 'Length of fraction part',
      },
    },
  }),
};

class ConstrainedDecimal extends GraphQLScalarType {
  constructor(type: GraphQLScalarType, regex: RegExp) {
    super({
      name: 'ConstrainedDecimal',
      parseValue(value) {
        const parsed = type.parseValue(value);
        if (typeof parsed === 'string' && regex.test(parsed)) {
          return parsed;
        }
        throw new LogicError(ErrorCode.GQL_VALUE_BAD);
      },
      serialize(value) {
        return type.serialize(value);
      },
      parseLiteral(ast, ...args) {
        const parsed = type.parseLiteral(ast, ...args);
        if (typeof parsed === 'string' && regex.test(parsed)) {
          return parsed;
        }
        throw new LogicError(ErrorCode.GQL_VALUE_BAD);
      },
    });
  }
}

export const schemaDirectives = {
  decimal: class DecimalDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
      if (field.type !== resolvers.Decimal) {
        throw new LogicError(ErrorCode.GQL_DIRECTIVE_TARGED);
      }
      const i = this.args.int;
      const f = this.args.fraction;
      const regex = new RegExp(`^\\d{1,${i}}(\\.\\d{0,${f})?'`);
      const { resolve = defaultFieldResolver } = field;
      field.resolve = async function (...args) {
        const result = await resolve.apply(this, args);
        if (typeof result === 'string' && regex.test(result)) {
          return result;
        }
        throw new LogicError(ErrorCode.GQL_VALUE_BAD);
      };
    }

    visitInputFieldDefinition(field: GraphQLInputField) {
      if (field.type !== resolvers.Decimal) {
        throw new LogicError(ErrorCode.GQL_DIRECTIVE_TARGED);
      }
      const i = this.args.int;
      const f = this.args.fraction;
      const regex = new RegExp(`^\\d{1,${i}}(\\.\\d{0,${f})?'`);

      // FIXME: Ensure it works as intended
      field.type = new ConstrainedDecimal(field.type as any, regex);
    }
  },
};
