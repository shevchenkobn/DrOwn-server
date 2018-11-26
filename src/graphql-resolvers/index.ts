import * as graphqlExpress from 'express-graphql';
import { makeExecutableSchema } from 'graphql-tools';
import { loadTypeSystem } from '../services/graphql.service';

import { schemaDirectives as commonSchemaDirectives } from './types/common';
import {
  resolvers as userResolvers,
  schemaDirectives as userSchemaDirectives,
} from './types/user.type';
import { resolvers as schemaResolvers } from './schema';
import { resolvers as directiveTypeResolvers, directiveResolvers } from './directives';
import { Request } from 'express';
import { Response } from 'express';
import * as graphqlHTTP from 'express-graphql';
// import {} from './types/authentication.type';

export async function getGraphqlHandler() {
  const typeDefs = await loadTypeSystem();
  const schema = makeExecutableSchema<{req: Request, res: Response}>({
    typeDefs,
    directiveResolvers,
    resolvers: [userResolvers, schemaResolvers, directiveTypeResolvers],
    schemaDirectives: { ...commonSchemaDirectives, ...userSchemaDirectives },
  });

  return (serveGraphiql = false) => graphqlExpress((req, res) => ({
    schema,
    context: {
      req,
      res,
    },
    graphiql: serveGraphiql,
    pretty: true,
  }));
}
