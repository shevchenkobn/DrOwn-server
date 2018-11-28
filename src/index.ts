import { initAsync } from './di/container'; // Import first to initialize all dependencies
import * as express from 'express';
import * as config from 'config';
import { Handler } from 'express';
import { UserModel } from './models/users.model';
import { bindCallbackOnExit } from './services/util.service';

const { host, port, gqlPath } = config.get<{
  host: string,
  port: number,
  gqlPath: string,
}>('server');

const app = express();

// Promise.all([
//   getGraphqlHandler(),
//   initAsync,
// ]).then(([handlerFactory]) => {
//   const notProduction = process.env.NODE_ENV !== 'production';
//   if (notProduction) {
//     app.get(gqlPath, handlerFactory(notProduction));
//   }
//   app.post(gqlPath, handlerFactory(false));
//
//   const server = app.listen(port, host);
//   bindCallbackOnExit(() => server.close());
//
//   console.log(`Listening at ${host}:${port}`);
//   if (global.gc) {
//     global.gc();
//   }
// }).catch(err => {
//   console.error(err);
//   process.emit('SIGINT', 'SIGINT');
//   setImmediate(() => process.exit(1));
// });
