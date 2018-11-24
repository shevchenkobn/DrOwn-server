"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// import { isUser } from '../services/validators.service';
const inversify_1 = require("inversify");
const types_1 = require("../di/types");
const bcrypt_1 = require("bcrypt");
const table_schemas_service_1 = require("../services/table-schemas.service");
const randomatic_1 = require("randomatic");
const db_connection_class_1 = require("../services/db-connection.class");
exports.maxPasswordLength = 72 - 29;
var UserRoles;
(function (UserRoles) {
    UserRoles[UserRoles["Customer"] = 1] = "Customer";
    UserRoles[UserRoles["Owner"] = 2] = "Owner";
    UserRoles[UserRoles["Landlord"] = 4] = "Landlord";
    UserRoles[UserRoles["Producer"] = 8] = "Producer";
    UserRoles[UserRoles["Maintainer"] = 16] = "Maintainer";
    UserRoles[UserRoles["Company"] = 32] = "Company";
    UserRoles[UserRoles["Moderator"] = 64] = "Moderator";
    UserRoles[UserRoles["Admin"] = 128] = "Admin";
})(UserRoles = exports.UserRoles || (exports.UserRoles = {}));
function isValidRole(role) {
    return typeof role === 'number' && role >= UserRoles.Customer && role <= UserRoles.Admin;
}
exports.isValidRole = isValidRole;
let UserModel = class UserModel {
    constructor(connection) {
        this._connection = connection;
        this._table = this._connection.knex(table_schemas_service_1.TableName.Users);
    }
    get table() {
        return this._table;
    }
    select(columns) {
        if (columns && columns.length > 0) {
            return this._table.select(columns);
        }
        return this._table.select();
    }
    async create(userSeed, changeSeed = false) {
        const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;
        const user = {
            email: userSeed.name,
            role: userSeed.role,
            name: userSeed.name,
            companyId: userSeed.companyId,
            address: userSeed.address,
            phoneNumber: userSeed.phoneNumber,
            cash: userSeed.cash,
        };
        if (!editedUserSeed.password) {
            editedUserSeed.password = randomatic_1.default('aA0!', exports.maxPasswordLength);
        }
        user.passwordHash = await bcrypt_1.hash(editedUserSeed.password, 13);
        await this._table.insert(user);
        return editedUserSeed;
    }
};
UserModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], UserModel);
exports.UserModel = UserModel;
//# sourceMappingURL=users.model.js.map