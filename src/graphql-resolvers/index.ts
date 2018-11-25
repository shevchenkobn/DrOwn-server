import { RequestHandler } from 'express';
import * as graphqlExpress from 'express-graphql';
import { makeExecutableSchema } from 'graphql-tools';

// TODO: compile schema, probably with async class
// const schema = makeExecutableSchema({
//   typeDefs:
// });

export const graphqlHandler: RequestHandler = graphqlExpress((req, res) => ({
  schema,
  context: {
    req,
    res,
  },
  graphiql: process.env.NODE_ENV !== 'production',
  pretty: true,
}));
