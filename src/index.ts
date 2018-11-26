import './di/container'; // Just to initialize all dependencies
import * as express from 'express';
import * as config from 'config';
import { getGraphqlHandler } from './graphql-resolvers';
import { Handler } from 'express';
import { UserModel } from './models/users.model';
import * as graphqlHTTP from 'express-graphql';

const { host, port, gqlPath } = config.get<{
  host: string,
  port: number,
  gqlPath: string,
}>('server');

const app = express();

getGraphqlHandler().catch(err => {
  console.error(err);
  process.emit('SIGINT', 'SIGINT');
  setImmediate(() => process.exit(1));
}).then(((handlerFactory: (s: boolean) => graphqlHTTP.Middleware) => {
  const notProduction = process.env.NODE_ENV !== 'production';
  if (notProduction) {
    app.get(gqlPath, handlerFactory(notProduction));
  }
  app.post(gqlPath, handlerFactory(false));
  app.listen(port, host);
  console.log(`Listening at ${host}:${port}`);
  if (global.gc) {
    global.gc();
  }
}) as any);
