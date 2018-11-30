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
    UserRoles[UserRoles["CUSTOMER"] = 1] = "CUSTOMER";
    UserRoles[UserRoles["OWNER"] = 2] = "OWNER";
    UserRoles[UserRoles["LANDLORD"] = 4] = "LANDLORD";
    UserRoles[UserRoles["PRODUCER"] = 8] = "PRODUCER";
    UserRoles[UserRoles["MAINTAINER"] = 16] = "MAINTAINER";
    UserRoles[UserRoles["COMPANY"] = 32] = "COMPANY";
    UserRoles[UserRoles["MODERATOR"] = 64] = "MODERATOR";
    UserRoles[UserRoles["ADMIN"] = 128] = "ADMIN";
})(UserRoles = exports.UserRoles || (exports.UserRoles = {}));
function isValidRole(role) {
    return typeof role === 'number' && role >= UserRoles.CUSTOMER && role <= UserRoles.ADMIN;
}
exports.isValidRole = isValidRole;
const safeColumns = [
    'userId',
    'role',
    'name',
    'companyId',
    'address',
    'phoneNumber',
    'longitude',
    'latitude',
    'cash',
];
let UserModel = class UserModel {
    constructor(connection) {
        this._connection = connection;
        this._knex = this._connection.knex;
    }
    get table() {
        return this._knex(table_schemas_service_1.TableName.Users);
    }
    select(columns, where, safeSelect = true) {
        let fields = columns;
        if (!columns) {
            fields = safeSelect ? safeColumns : [];
        }
        const query = where ? this.table.where(where) : this.table;
        return query.select(fields);
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
                throw new error_service_1.LogicError(error_service_2.ErrorCode.USER_COMPANY_NO);
            }
            editedUserSeed.password = randomatic_1.default('aA0!', exports.maxPasswordLength);
        }
        user.passwordHash = await bcrypt_1.hash(editedUserSeed.password, 13);
        try {
            await this.table.insert(user);
        }
        catch (err) {
            // FIXME: throw  duplicate name or some other error if some connection problems
            throw new error_service_1.LogicError(error_service_2.ErrorCode.USER_DUPLICATE_EMAIL);
        }
        const selectedUser = (await this.select(selectColumns, { email: editedUserSeed.email }))[0];
        return selectedUser;
    }
};
UserModel = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [db_connection_class_1.DbConnection])
], UserModel);
exports.UserModel = UserModel;
//# sourceMappingURL=users.model.js.map