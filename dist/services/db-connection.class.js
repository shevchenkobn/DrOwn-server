"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Knex = require("knex");
const config = require("config");
const util_service_1 = require("./util.service");
class DbConnection {
    constructor(knexConfig = config.get('dbConnection')) {
        this.config = {
            client: 'mysql',
            connection: {
                ...knexConfig,
                supportBigNumbers: true,
                bigNumberStrings: true,
            },
        };
        this.knex = Knex(this.config);
        util_service_1.bindCallbackOnExit(() => {
            // TODO: add logging
            console.log(`Closing database connection for ${this.config.client} at ${this.config.connection.host} to ${this.config.connection.database}`);
            this.knex.destroy(() => console.log(`Closed database connection for ${this.config.client} mysql at ${this.config.connection.host} to ${this.config.connection.database}`));
        });
    }
}
exports.DbConnection = DbConnection;
//# sourceMappingURL=db-connection.class.js.map