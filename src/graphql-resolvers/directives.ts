import {
  defaultFieldResolver,
  GraphQLArgument,
  GraphQLField,
  GraphQLInputField,
  GraphQLNonNull,
  GraphQLScalarType,
} from 'graphql';
import { IDirectiveResolvers, SchemaDirectiveVisitor } from 'graphql-tools';
import { IUser, UserRoles } from '../models/users.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { getUserFromRequest } from '../services/authentication.service';

export const resolvers = {
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

export const directiveResolvers: IDirectiveResolvers = {
  authorized: async (next, source, { roles: roleNames }, ctx) => {
    let user: IUser;
    if (typeof ctx.user === 'object') {
      user = ctx.user;
    } else {
      try {
        user = await getUserFromRequest(ctx.req);
      } catch (err) {
        if (err.name === 'TokenExpiredError') {
          throw new LogicError(ErrorCode.AUTH_EXPIRED);
        }
        throw new LogicError(ErrorCode.AUTH_NO);
      }
      ctx.user = user;
    }
    if (roleNames && roleNames.length > 0) {
      const roles: number[] = roleNames.map((name: any) => UserRoles[name as any]);
      for (const role of roles) {
        if ((user.role & role) !== 0) {
          next();
          return;
        }
      }
      throw new LogicError(ErrorCode.AUTH_ROLE);
    }
    next();
  },

  string(next, ...allArgs) {
    console.log(allArgs);
    next();
  },
};

class ConstrainedString extends GraphQLScalarType {
  constructor(type: GraphQLScalarType, maxLength?: number, regex?: RegExp) {
    if (!maxLength && !regex) {
      throw new LogicError(ErrorCode.GQL_DIRECTIVE_ARGUMENT);
    }

    function validate(value: any) {
      if (typeof value !== 'string') {
        throw new LogicError(ErrorCode.GQL_VALUE_BAD);
      }
      if (maxLength && value.length <= maxLength) {
        throw new LogicError(ErrorCode.GQL_VALUE_BAD);
      }
      if (regex && !regex.test(value)) {
        throw new LogicError(ErrorCode.GQL_VALUE_BAD);
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

export const schemaDirectives = {
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
