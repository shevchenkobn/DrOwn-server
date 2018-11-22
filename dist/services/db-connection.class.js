"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Knex = require("knex");
const config = require("config");
const util_service_1 = require("./util.service");
class DbConnection {
    constructor(knexConfig = config.get('knex')) {
        this.config = knexConfig;
        this.knex = Knex(knexConfig);
        util_service_1.bindCallbackOnExit(() => {
            // TODO: add logging
            console.log(`Closing database connection for ${knexConfig.client} mysql at ${knexConfig.connection.host} to ${knexConfig.connection.database}`);
            this.knex.destroy(() => console.log(`Closed database connection for ${knexConfig.client} mysql at ${knexConfig.connection.host} to ${knexConfig.connection.database}`));
        });
    }
}
exports.DbConnection = DbConnection;
//# sourceMappingURL=db-connection.class.js.map