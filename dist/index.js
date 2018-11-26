"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./di/container"); // Just to initialize all dependencies
const express = require("express");
const config = require("config");
const graphql_resolvers_1 = require("./graphql-resolvers");
const { host, port, gqlPath } = config.get('server');
const app = express();
graphql_resolvers_1.getGraphqlHandler(process.env.NODE_ENV !== 'production').catch(err => {
    console.error(err);
    process.emit('SIGINT', 'SIGINT');
    setImmediate(() => process.exit(1));
}).then(handler => {
    app.get(gqlPath, handler);
    app.listen(port, host);
    console.log(`Listening at ${host}:${port}`);
    if (global.gc) {
        global.gc();
    }
});
//# sourceMappingURL=index.js.map