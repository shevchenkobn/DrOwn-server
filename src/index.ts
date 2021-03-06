import { TYPES } from './di/types'; // Import first to initialize all dependencies
import { container, initAsync } from './di/container';

import * as express from 'express';
import * as config from 'config';
import * as cors from 'cors';
import { bindOnExitHandler, loadSwaggerSchema, normalizeOrigins } from './services/util.service';
import { initializeMiddleware } from 'swagger-tools';
import { authenticateBearer } from './services/handler.service';
import { resolve } from 'path';
import { errorHandler, notFoundHandler } from './services/error.service';
import { Server } from 'http';
import { SocketIoController } from './controllers/socket-io.controller';
import { createServer } from 'http';
import * as path from 'path';

export interface ServerConfig {
  host: string;
  port: number;
  swaggerDocsPrefix: string;
  staticPath?: string;
}

export interface CorsConfig {
  whitelist: string | string[];
  methods: string[];
}

const { host, port, swaggerDocsPrefix, staticPath } = config.get<ServerConfig>('server');
const { whitelist: whitelistOrigin, methods: corsMethods } = config.get<CorsConfig>('cors');

const app = express();

Promise.all([
  loadSwaggerSchema(),
  initAsync(),
]).then(([schemaResults, initResults]) => {
  const notProduction = process.env.NODE_ENV !== 'production';

  initializeMiddleware(schemaResults.resolved, middleware => {
    const server = createServer(app);
    container.bind<Server>(TYPES.HttpServer).toConstantValue(server);

    app.use(cors({
      methods: corsMethods,
      origin: normalizeOrigins(
        typeof whitelistOrigin === 'string' ? [whitelistOrigin] : whitelistOrigin,
      ),
      preflightContinue: false,
      optionsSuccessStatus: 204,
    }));

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

    if (typeof staticPath === 'string') {
      const absPath = path.resolve(staticPath);
      app.use(express.static(absPath));
      console.info(`Serving static from ${absPath}`);
    }

    app.use(errorHandler);

    app.use(notFoundHandler);

    const ioApp = container.get<SocketIoController>(TYPES.SocketIoController);

    bindOnExitHandler(() => {
      server.close();
      ioApp.close();
    });

    server.on('error', (...args) => {
      console.error(args);
      process.emit('SIGINT', 'SIGINT');
    });

    server.listen(port, host, () => {
      console.log(`Listening at ${host}:${port}`);
      if (global.gc) {
        global.gc();
      }
    });
  });
}).catch(err => {
  console.error(err);
  process.emit('SIGINT', 'SIGINT');
  // setImmediate(() => process.exit(1));
});
