"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const container_1 = require("./di/container"); // Import first to initialize all dependencies
const express = require("express");
const config = require("config");
const util_service_1 = require("./services/util.service");
const { host, port, gqlPath } = config.get('server');
const app = express();
Promise.all([
    util_service_1.loadSwaggerSchema(),
    container_1.initAsync,
]).then(([schemaResults]) => {
    const notProduction = process.env.NODE_ENV !== 'production';
    console.log(schemaResults);
    debugger;
    // TODO: Initialize swagger and the app
    // if (notProduction) {
    //   app.get(gqlPath, handlerFactory(notProduction));
    // }
    // app.post(gqlPath, handlerFactory(false));
    //
    // const server = app.listen(port, host);
    // bindCallbackOnExit(() => server.close());
    //
    // console.log(`Listening at ${host}:${port}`);
    if (global.gc) {
        global.gc();
    }
}).catch(err => {
    console.error(err);
    process.emit('SIGINT', 'SIGINT');
    // setImmediate(() => process.exit(1));
});
//# sourceMappingURL=index.js.map