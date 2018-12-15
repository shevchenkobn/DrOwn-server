"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const db_connection_class_1 = require("../services/db-connection.class");
const table_names_1 = require("../services/table-names");
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus[TransactionStatus["PENDING"] = 0] = "PENDING";
    TransactionStatus[TransactionStatus["CONFIRMED"] = 1] = "CONFIRMED";
    TransactionStatus[TransactionStatus["REJECTED"] = 2] = "REJECTED";
})(TransactionStatus = exports.TransactionStatus || (exports.TransactionStatus = {}));
let TransactionsModel = class TransactionsModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_names_1.TableName.Drones);
    }
    select(columns, where) {
        const query = where ? this.table.where(where) : this.table;
        return query.select(columns);
    }
};
TransactionsModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], TransactionsModel);
exports.TransactionsModel = TransactionsModel;
//# sourceMappingURL=transactions.model.js.map