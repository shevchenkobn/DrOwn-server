import { GraphQLScalarType, validate } from 'graphql';
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
import { IResolvers } from 'graphql-tools';

// const UserRole = new GraphQLEnumType({
//   name: 'UserRole',
//   values: Object.keys(UserRoles).reduce((values, key) => {
//     if (Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
//       return values;
//     }
//     values[key] = {
//       value: UserRoles[key as any] as any,
//     };
//     return values;
//   }, {} as {[role: string]: { value: number }}),
// });

export const resolvers = {
  UserRole: Object.keys(UserRoles).reduce((values, key) => {
    if (Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
      return values;
    }
    values[key] = UserRoles[key as any] as any;
    return values;
  }, {} as {[role: string]: number}),

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

  // notRoles: new GraphQLDirective({
  //   name: 'notRoles',
  //   description: 'A directive prohibiting particular roles',
  //   locations: ['INPUT_FIELD_DEFINITION'],
  //   args: {
  //     roles: {
  //       type: new GraphQLList(UserRole),
  //       description: 'Roles to exclude',
  //     },
  //   },
  // }),
};

class ConstrainedUserRoles extends GraphQLScalarType {
  constructor(type: GraphQLScalarType, excludeRoles: UserRoles[]) {
    super({
      name: 'ConstrainedDecimal',
      parseValue(value) {
        const parsed = type.parseValue(value);
        if (typeof parsed !== 'number') {
          throw new LogicError(ErrorCode.GQL_VALUE_BAD);
        }
        let rolesAreGood = true;
        for (const role of excludeRoles) {
          if (parsed & role) {
            rolesAreGood = false;
            break;
          }
        }
        if (!rolesAreGood) {
          throw new LogicError(ErrorCode.GQL_VALUE_BAD);
        }
        return parsed;
      },
      serialize(value) {
        return type.serialize(value);
      },
      parseLiteral(ast, ...args) {
        const parsed = type.parseLiteral(ast, ...args);
        if (typeof parsed !== 'number') {
          throw new LogicError(ErrorCode.GQL_VALUE_BAD);
        }
        let rolesAreGood = true;
        for (const role of excludeRoles) {
          if (parsed & role) {
            rolesAreGood = false;
            break;
          }
        }
        if (!rolesAreGood) {
          throw new LogicError(ErrorCode.GQL_VALUE_BAD);
        }
        return parsed;
      },
    });
  }
}

export const schemaDirectives = {
  notRoles: class NotRolesDirective extends SchemaDirectiveVisitor {
    visitInputFieldDefinition(field: GraphQLInputField) {
      if (field.type !== resolvers.UserRoles) {
        throw new LogicError(ErrorCode.GQL_DIRECTIVE_TARGED);
      }
      const excludeRoles = this.args.roles;

      // FIXME: Ensure it works as intended
      field.type = new ConstrainedUserRoles(field.type as any, excludeRoles);
    }
  },
};
