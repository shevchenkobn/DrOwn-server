"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("./di/types"); // Import first to initialize all dependencies
const container_1 = require("./di/container");
const express = require("express");
const util_service_1 = require("./services/util.service");
const swagger_tools_1 = require("swagger-tools");
const handler_service_1 = require("./services/handler.service");
const path_1 = require("path");
const error_service_1 = require("./services/error.service");
const transactions_controller_1 = require("./rest-controllers/transactions.controller");
const { host, port, swaggerDocsPrefix } = container_1.container.get(types_1.TYPES.HttpServer);
const app = express();
Promise.all([
    util_service_1.loadSwaggerSchema(),
    container_1.initAsync(),
    transactions_controller_1.restoreRentingQueue(),
]).then(([schemaResults, initResults]) => {
    const notProduction = process.env.NODE_ENV !== 'production';
    swagger_tools_1.initializeMiddleware(schemaResults.resolved, middleware => {
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
        app.use(error_service_1.errorHandler);
        app.use(error_service_1.notFoundHandler);
        const server = app.listen(port, host);
        container_1.container.bind(types_1.TYPES.HttpServer).toConstantValue(server);
        const ioApp = container_1.container.get(types_1.TYPES.SocketIoController);
        ioApp.listen(port);
        util_service_1.bindCallbackOnExit(() => {
            server.close();
            ioApp.close();
        });
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
//# sourceMappingURL=index.js.map