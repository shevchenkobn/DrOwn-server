"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Knex = require("knex");
const config = require("config");
class DbConnection {
    constructor(knexConfig = config.get('knex')) {
        this.knex = Knex(knexConfig);
    }
}
exports.DbConnection = DbConnection;
//# sourceMappingURL=db-connection.class.js.map