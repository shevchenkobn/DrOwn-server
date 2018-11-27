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
const error_service_1 = require("../services/error.service");
const error_service_2 = require("../services/error.service");
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
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_schemas_service_1.TableName.Users);
    }
    select(columns, where) {
        const query = where ? this.table.where(where) : this.table;
        return columns && columns.length > 0 ? query.select(columns) : query.select();
    }
    async create(userSeed, changeSeed = false, selectColumns) {
        const editedUserSeed = changeSeed ? { ...userSeed } : userSeed;
        const user = {
            email: userSeed.email,
            role: userSeed.role,
            name: userSeed.name,
            companyId: userSeed.companyId,
            address: userSeed.address,
            phoneNumber: userSeed.phoneNumber,
            cash: userSeed.cash,
        };
        if (!editedUserSeed.password) {
            if (!editedUserSeed.companyId) {
                throw new error_service_1.LogicError(error_service_2.ErrorCode.USER_NO_REGISTER_DATA);
            }
            editedUserSeed.password = randomatic_1.default('aA0!', exports.maxPasswordLength);
        }
        user.passwordHash = await bcrypt_1.hash(editedUserSeed.password, 13);
        try {
            await this.table.insert(user);
        }
        catch (err) {
            // FIXME: throw  duplicate name or some other error
            throw new error_service_1.LogicError(error_service_2.ErrorCode.USER_DUPLICATE_EMAIL);
        }
        if (selectColumns) {
            return (await this.select(selectColumns, { email: editedUserSeed.email }))[0];
        }
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