import './di/container'; // Just to initialize all dependencies
import * as express from 'express';
import * as config from 'config';
import { getGraphqlHandler } from './graphql-resolvers';
import { Handler } from 'express';

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
}).then(handler => {
  app.post(gqlPath, handler as Handler);
  app.listen(port, host);
  console.log(`Listening at ${host}:${port}`);
});
