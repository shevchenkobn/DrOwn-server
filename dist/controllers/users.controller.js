"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const users_model_1 = require("../models/users.model");
const error_service_1 = require("../services/error.service");
let UsersController = class UsersController {
    constructor(userModel) {
        return {
            async getUsers(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const user = req.user;
                    const columns = getColumns(select, !!(user.role & users_model_1.UserRoles.ADMIN
                        || user.role & users_model_1.UserRoles.MODERATOR));
                    if (select && columns.length < select.length) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.SELECT_BAD));
                        return;
                    }
                    // TODO: add filters and sorting
                    res.json(await userModel.select(columns));
                }
                catch (err) {
                    next(err);
                }
            },
            async createUser(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const inputUser = req.swagger.params.user.value;
                    const user = req.user;
                    if (!(user.role & users_model_1.UserRoles.ADMIN)
                        && (inputUser.role & users_model_1.UserRoles.ADMIN
                            || inputUser.role & users_model_1.UserRoles.MODERATOR)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const noPassword = !inputUser.password;
                    const selectPassword = select && select.includes('password');
                    if (noPassword && !(!select || selectPassword)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_NO_SAVE_PASSWORD));
                        return;
                    }
                    if (!noPassword && selectPassword) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.SELECT_BAD));
                        return;
                    }
                    if (user.role & users_model_1.UserRoles.COMPANY && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        if (inputUser.companyId) {
                            const companyId = user.userId;
                            let users = [inputUser];
                            let userId;
                            let found = false;
                            while (users[0].companyId) {
                                userId = users[0].companyId;
                                users = (await userModel.select(['role', 'companyId', 'userId'], { userId }));
                                if (users.length === 0 || !(users[0].role & users_model_1.UserRoles.COMPANY)) {
                                    next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_COMPANY_BAD));
                                    return;
                                }
                                if (users[0].userId === companyId) {
                                    found = true;
                                    break;
                                }
                            }
                            if (!found) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_COMPANY_BAD));
                                return;
                            }
                        }
                        else {
                            inputUser.companyId = user.userId;
                        }
                    }
                    // if (user.role & UserRoles.COMPANY && !(user.role & UserRoles.ADMIN)) {
                    //   if (inputUser.role & UserRoles.ADMIN || inputUser.role & UserRoles.MODERATOR) {
                    //     next(new LogicError(ErrorCode.AUTH_ROLE));
                    //     return;
                    //   }
                    //   if (inputUser.companyId && inputUser.companyId !== user.userId) {
                    //     next(new LogicError(ErrorCode.USER_COMPANY_BAD));
                    //     return;
                    //   }
                    //   inputUser.companyId = user.userId;
                    // }
                    // const noPassword = !inputUser.password;
                    // const selectPassword = select && select.includes('password');
                    // if (noPassword && !(!select || selectPassword)) {
                    //   next(new LogicError(ErrorCode.USER_NO_SAVE_PASSWORD));
                    //   return;
                    // }
                    // if (!noPassword && selectPassword) {
                    //   next(new LogicError(ErrorCode.SELECT_BAD));
                    //   return;
                    // }
                    // inputUser.password = userModel.getPassword(inputUser);
                    // if (user.role & UserRoles.ADMIN) {
                    //   let users = [inputUser];
                    //   let userId;
                    //   while (users[0].companyId) {
                    //     userId = inputUser.companyId;
                    //     users = await userModel.select(['role', 'companyId'], { userId });
                    //
                    //     if (!(users[0].role & UserRoles.COMPANY)) {
                    //       next(new LogicError(ErrorCode.USER_COMPANY_NO));
                    //       return;
                    //     }
                    //   }
                    // }
                    inputUser.password = userModel.getPassword(inputUser);
                    await userModel.create(inputUser, true);
                    const newUser = (await userModel.select(getColumns(select, true), { email: inputUser.email }))[0];
                    if (noPassword) {
                        newUser.password = inputUser.password;
                    }
                    res.json(newUser);
                }
                catch (err) {
                    next(err);
                }
            },
        };
    }
};
UsersController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__metadata("design:paramtypes", [users_model_1.UserModel])
], UsersController);
exports.UsersController = UsersController;
const safeColumns = [
    'userId',
    'role',
    'name',
    'companyId',
];
const adminFields = [
    'phoneNumber',
    'cash',
    'address',
    'longitude',
    'latitude',
];
function getColumns(columns, includeAdmin = false) {
    if (!columns || columns.length === 0) {
        return (includeAdmin ? safeColumns.concat(adminFields) : safeColumns);
    }
    return columns.filter(column => safeColumns.includes(column)
        || includeAdmin && adminFields.includes(column));
}
exports.getColumns = getColumns;
//# sourceMappingURL=users.controller.js.map