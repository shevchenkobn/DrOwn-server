import { GraphQLDirective } from 'graphql';
import { resolvers as userResolvers } from './types/user.type';
import { IDirectiveResolvers } from 'graphql-tools';
import { IUser } from '../models/users.model';
import { ErrorCode, LogicError } from '../services/error.service';

export const resolvers = {
  authorized: new GraphQLDirective({
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
        type: userResolvers.UserRoles,
        description: 'Bitmask of allowed roles',
      },
    },
  }),
};

export const directiveResolvers: IDirectiveResolvers = {
  authorized: (next, source, { roles }, ctx) => {
    let user: IUser;
    try {
      // TODO: get user from context
      user = {} as any;
    } catch (err) {
      throw new LogicError(ErrorCode.AUTH_NO);
    }
    if (roles && roles.length > 0) {
      for (const role of roles) {
        if ((user.role & role) === 0) {
          throw new LogicError(ErrorCode.AUTH_ROLE);
        }
      }
    }
    next();
  },
};
