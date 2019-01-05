"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./di/types"); // Import first to initialize all dependencies
const container_1 = require("./di/container");
const express = require("express");
const config = require("config");
const cors = require("cors");
const util_service_1 = require("./services/util.service");
const swagger_tools_1 = require("swagger-tools");
const handler_service_1 = require("./services/handler.service");
const path_1 = require("path");
const error_service_1 = require("./services/error.service");
const http_1 = require("http");
const path = require("path");
const { host, port, swaggerDocsPrefix, staticPath } = config.get('server');
const { whitelist: whitelistOrigin, methods: corsMethods } = config.get('cors');
const app = express();
Promise.all([
    util_service_1.loadSwaggerSchema(),
    container_1.initAsync(),
]).then(([schemaResults, initResults]) => {
    const notProduction = process.env.NODE_ENV !== 'production';
    swagger_tools_1.initializeMiddleware(schemaResults.resolved, middleware => {
        const server = http_1.createServer(app);
        container_1.container.bind(types_1.TYPES.HttpServer).toConstantValue(server);
        app.use(cors({
            methods: corsMethods,
            origin: util_service_1.normalizeOrigins(typeof whitelistOrigin === 'string' ? [whitelistOrigin] : whitelistOrigin),
            preflightContinue: false,
            optionsSuccessStatus: 204
        }));
        app.use(middleware.swaggerMetadata());
        app.use(middleware.swaggerSecurity({
            Bearer: handler_service_1.authenticateBearer,
        }));
        app.use(middleware.swaggerValidator({
            validateResponse: false,
        }));
        app.use(middleware.swaggerRouter({
            ignoreMissingHandlers: false,
            useStubs: notProduction,
            controllers: path_1.resolve(__dirname, './swagger-controllers'),
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
        app.use(error_service_1.errorHandler);
        app.use(error_service_1.notFoundHandler);
        const ioApp = container_1.container.get(types_1.TYPES.SocketIoController);
        util_service_1.bindCallbackOnExit(() => {
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
//# sourceMappingURL=index.js.map