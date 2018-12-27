"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const inversify_1 = require("inversify");
const types_1 = require("../di/types");
const bcrypt_1 = require("bcrypt");
const table_names_1 = require("../services/table-names");
const db_connection_class_1 = require("../services/db-connection.class");
const error_service_1 = require("../services/error.service");
exports.maxPasswordLength = 72 - 29;
var UserRoles;
(function (UserRoles) {
    UserRoles[UserRoles["CUSTOMER"] = 1] = "CUSTOMER";
    UserRoles[UserRoles["OWNER"] = 2] = "OWNER";
    UserRoles[UserRoles["ADMIN"] = 4] = "ADMIN";
})(UserRoles = exports.UserRoles || (exports.UserRoles = {}));
function isValidRole(role) {
    return typeof role === 'number' && role >= UserRoles.CUSTOMER && role <= UserRoles.ADMIN;
}
exports.isValidRole = isValidRole;
let UserModel = class UserModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_names_1.TableName.Users);
    }
    select(columns, where) {
        const query = where ? this.table.where(where) : this.table;
        return query.select(columns);
    }
    async create(userSeed, changeSeed = false) {
        const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;
        const { password, ...user } = userSeed;
        user.passwordHash = await bcrypt_1.hash(editedUserSeed.password, 13);
        try {
            return await this.table.insert(user);
        }
        catch (err) {
            handleChangeError(err);
        }
    }
    async update(userSeed, whereClause, changeSeed = false) {
        const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;
        const { password, ...user } = userSeed;
        if (password) {
            user.passwordHash = await bcrypt_1.hash(editedUserSeed.password, 13);
        }
        try {
            return await this.table.where(whereClause).update(user);
        }
        catch (err) {
            handleChangeError(err);
        }
    }
    async delete(whereClause) {
        return this.table.where(whereClause).delete();
    }
};
UserModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], UserModel);
exports.UserModel = UserModel;
function handleChangeError(err) {
    switch (err.errno) {
        case 1062:
            throw new error_service_1.LogicError(error_service_1.ErrorCode.USER_EMAIL_DUPLICATE);
        case 1051:
            throw new error_service_1.LogicError(error_service_1.ErrorCode.USER_HAS_DRONES);
    }
    console.log('change user error: ', err);
    throw new error_service_1.LogicError(error_service_1.ErrorCode.SERVER);
}
//# sourceMappingURL=users.model.js.map