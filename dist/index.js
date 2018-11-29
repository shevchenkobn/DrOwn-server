"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const container_1 = require("./di/container"); // Import first to initialize all dependencies
const express = require("express");
const config = require("config");
const util_service_1 = require("./services/util.service");
const swagger_tools_1 = require("swagger-tools");
const handler_service_1 = require("./services/handler.service");
const path_1 = require("path");
const { host, port, swaggerDocsPrefix } = config.get('server');
const app = express();
Promise.all([
    util_service_1.loadSwaggerSchema(),
    container_1.initAsync,
]).then(([schemaResults]) => {
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
            useStubs: false,
            controllers: path_1.resolve(__dirname, './swagger-controllers'),
        }));
        app.use(middleware.swaggerUi({
            apiDocs: '/api-docs',
            apiDocsPrefix: swaggerDocsPrefix,
            swaggerUi: '/docs',
            swaggerUiPrefix: swaggerDocsPrefix,
        }));
        const server = app.listen(port, host);
        util_service_1.bindCallbackOnExit(() => server.close());
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