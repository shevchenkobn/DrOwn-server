import { initAsync } from './di/container'; // Import first to initialize all dependencies
import * as express from 'express';
import * as config from 'config';
import { Handler } from 'express';
import { UserModel } from './models/users.model';
import { bindCallbackOnExit, loadSwaggerSchema } from './services/util.service';
import { initializeMiddleware } from 'swagger-tools';
import { authenticateBearer } from './services/handler.service';
import { resolve } from 'path';

const { host, port, swaggerDocsPrefix } = config.get<{
  host: string,
  port: number,
  swaggerDocsPrefix: string,
}>('server');

const app = express();

Promise.all([
  loadSwaggerSchema(),
  initAsync,
]).then(([schemaResults]) => {
  const notProduction = process.env.NODE_ENV !== 'production';

  initializeMiddleware(schemaResults.resolved, middleware => {
    app.use(middleware.swaggerMetadata());

    app.use(middleware.swaggerSecurity({
      Bearer: authenticateBearer,
    }));

    app.use(middleware.swaggerValidator({
      validateResponse: false,
    }));

    app.use(middleware.swaggerRouter({
      ignoreMissingHandlers: false,
      useStubs: false, // notProduction,
      controllers: resolve(__dirname, './swagger-controllers'),
    }));

    app.use(middleware.swaggerUi({
      apiDocs: '/api-docs',
      apiDocsPrefix: swaggerDocsPrefix,

      swaggerUi: '/docs',
      swaggerUiPrefix: swaggerDocsPrefix,
    }));

    const server = app.listen(port, host);
    bindCallbackOnExit(() => server.close());

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
