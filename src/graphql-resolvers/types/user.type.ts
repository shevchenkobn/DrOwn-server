import { GraphQLScalarType } from 'graphql';
import { Kind } from 'graphql';
import { ErrorCode, LogicError } from '../../services/error.service';
import { isValidRole } from '../../models/users.model';
import { GraphQLDirective, GraphQLList } from 'graphql';
import { GraphQLInt } from 'graphql';
import { GraphQLEnumType } from 'graphql';
import { UserRoles } from '../../models/users.model';
import { SchemaDirectiveVisitor } from 'graphql-tools';
import { GraphQLField } from 'graphql';
import { defaultFieldResolver } from 'graphql';
import { GraphQLInputField } from 'graphql';

const UserRole = new GraphQLEnumType({
  name: 'UserRole',
  values: Object.keys(UserRoles).reduce((values, key) => {
    if (Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
      return values;
    }
    values[key] = {
      value: UserRoles[key as any] as any,
    };
    return values;
  }, {} as {[role: string]: { value: number }}),
});

export const resolvers = {
  UserRole,

  UserRoles: new GraphQLScalarType({
    name: 'UserRoles',
    description: 'A bitmask field describing user roles',
    parseValue(value) {
      if (isValidRole(value)) {
        return value;
      }
      throw new LogicError(ErrorCode.GQL_VALUE_BAD);
    },
    serialize(value) {
      return value;
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT && isValidRole(ast.value)) {
        return ast.value;
      }
      throw new LogicError(ErrorCode.GQL_VALUE_BAD);
    },
  }),

  notRoles: new GraphQLDirective({
    name: 'notRoles',
    description: 'A directive prohibiting particular roles',
    locations: ['INPUT_FIELD_DEFINITION'],
    args: {
      roles: {
        type: new GraphQLList(UserRole),
        description: 'Roles to exclude',
      },
    },
  }),
};

export const directiveResolvers = {
  notRoles: class NotRolesDirective extends SchemaDirectiveVisitor {
    visitInputFieldDefinition(field: GraphQLInputField) {
      if (field.type !== resolvers.UserRoles) {
        throw new LogicError(ErrorCode.GQL_DIRECTIVE_TARGED);
      }
      const excludeRoles = this.args.roles;
      const { resolve = defaultFieldResolver } = field;
      field.resolve = async function (...args) {
        const result = await resolve.apply(this, args);
        if (typeof result !== 'number') {
          throw new LogicError(ErrorCode.GQL_VALUE_BAD);
        }
        let rolesAreGood = true;
        for (const role of excludeRoles) {
          if (result & role) {
            rolesAreGood = false;
            break;
          }
        }
        if (!rolesAreGood) {
          throw new LogicError(ErrorCode.GQL_VALUE_BAD);
        }
        return result;
      };
    }
  },
};
