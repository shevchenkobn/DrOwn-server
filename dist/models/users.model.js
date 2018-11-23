"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bcrypt_1 = require("bcrypt");
const table_schemas_service_1 = require("../services/table-schemas.service");
const randomatic_1 = require("randomatic");
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
async function createUser(knex, userSeed, changeSeed = false) {
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
    await knex(table_schemas_service_1.TableName.Users).insert(user);
    return editedUserSeed;
}
exports.createUser = createUser;
//# sourceMappingURL=users.model.js.map