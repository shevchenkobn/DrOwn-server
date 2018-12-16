import { TYPES } from './di/types'; // Import first to initialize all dependencies
import { container, initAsync } from './di/container';

import * as express from 'express';
import * as config from 'config';
import { bindCallbackOnExit, loadSwaggerSchema } from './services/util.service';
import { initializeMiddleware } from 'swagger-tools';
import { authenticateBearer } from './services/handler.service';
import { resolve } from 'path';
import { errorHandler, notFoundHandler } from './services/error.service';
import { Server } from 'http';
import { SocketIoController } from './controllers/socket-io.controller';
import { restoreRentingSchedule } from './rest-controllers/transactions.controller';
import { createServer } from 'http';

export interface ServerConfig {
  host: string;
  port: number;
  swaggerDocsPrefix: string;
}

const { host, port, swaggerDocsPrefix } = config.get<ServerConfig>('server');

const app = express();

Promise.all([
  loadSwaggerSchema(),
  initAsync(),
  restoreRentingSchedule(),
]).then(([schemaResults, initResults]) => {
  const notProduction = process.env.NODE_ENV !== 'production';

  initializeMiddleware(schemaResults.resolved, middleware => {
    const server = createServer(app);
    container.bind<Server>(TYPES.HttpServer).toConstantValue(server);

    app.use(middleware.swaggerMetadata());

    app.use(middleware.swaggerSecurity({
      Bearer: authenticateBearer,
    }));

    app.use(middleware.swaggerValidator({
      validateResponse: false,
    }));

    app.use(middleware.swaggerRouter({
      ignoreMissingHandlers: false,
      useStubs: notProduction,
      controllers: resolve(__dirname, './swagger-controllers'),
    }));

    app.use(middleware.swaggerUi({
      apiDocs: '/api-docs',
      apiDocsPrefix: swaggerDocsPrefix,

      swaggerUi: '/docs',
      swaggerUiPrefix: swaggerDocsPrefix,
    }));

    app.use(errorHandler);

    app.use(notFoundHandler);

    const ioApp = container.get<SocketIoController>(TYPES.SocketIoController);

    bindCallbackOnExit(() => {
      server.close();
      ioApp.close();
    });

    server.listen(host, port);

    console.log(`Listening at ${host}:${port}`);
    if (global.gc) {
      global.gc();
    }
  });
}).catch(err => {
  console.error(err);
  process.emit('SIGINT', 'SIGINT');
  // setImmediate(() => process.exit(1));
});
