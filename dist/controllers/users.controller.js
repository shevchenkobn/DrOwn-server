"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const users_model_1 = require("../models/users.model");
const error_service_1 = require("../services/error.service");
const util_service_1 = require("../services/util.service");
let UsersController = class UsersController {
    constructor(userModel) {
        return {
            async getUsers(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const user = req.user;
                    const columns = getColumns(select, !!(user.role & users_model_1.UserRoles.ADMIN));
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
                    if (!inputUser.password) {
                        inputUser.password = userModel.getPassword();
                    }
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
            async updateUser(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const inputUser = req.swagger.params.user.value;
                    const userId = util_service_1.getSafeSwaggerParam(req, 'userId');
                    const email = util_service_1.getSafeSwaggerParam(req, 'email');
                    const user = req.user;
                    const [whereClause] = getUserWhereClause(userId, email, user);
                    const passwordUpdated = inputUser.password === '';
                    const selectPassword = select && select.length > 0 && select.includes('password');
                    if (passwordUpdated) {
                        inputUser.password = userModel.getPassword();
                        if (!selectPassword) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_NO_SAVE_PASSWORD));
                            return;
                        }
                    }
                    else if (selectPassword) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.SELECT_BAD));
                        return;
                    }
                    if (inputUser.role & users_model_1.UserRoles.ADMIN && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const affectedRows = await userModel.update(inputUser, whereClause);
                    if (affectedRows === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    if (select && select.length > 0) {
                        const newUser = (await userModel.select(getColumns(select, true), whereClause))[0];
                        if (passwordUpdated) {
                            newUser.password = inputUser.password;
                        }
                        res.json(newUser);
                    }
                    else {
                        res.json({});
                    }
                }
                catch (err) {
                    next(err);
                }
            },
            async deleteUser(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const userId = util_service_1.getSafeSwaggerParam(req, 'userId');
                    const email = util_service_1.getSafeSwaggerParam(req, 'email');
                    const user = req.user;
                    const [whereClause, foreignUser] = getUserWhereClause(userId, email, user);
                    let oldUser = null;
                    if (select && select.length > 0) {
                        const columns = getColumns(select, true);
                        oldUser = foreignUser
                            ? (await userModel.select(columns, whereClause))[0]
                            : Object.keys(user).reduce((mapped, c) => {
                                if (columns.includes(c)) {
                                    mapped[c] = user[c];
                                }
                                return mapped;
                            }, {});
                    }
                    const affectedRows = await userModel.delete(whereClause);
                    if (affectedRows === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    if (oldUser) {
                        res.json(oldUser);
                    }
                    else {
                        res.json({});
                    }
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
    'email',
    'role',
    'name',
    'status',
];
const adminFields = [
    'phoneNumber',
    'cash',
    'address',
    'longitude',
    'latitude',
];
function getColumns(columns, includeAdmin) {
    if (!columns || columns.length === 0) {
        return (includeAdmin ? safeColumns.concat(adminFields) : safeColumns);
    }
    return columns.filter(column => safeColumns.includes(column)
        || includeAdmin && adminFields.includes(column));
}
exports.getColumns = getColumns;
function getUserWhereClause(userId, email, user) {
    if (email && userId) {
        throw new error_service_1.LogicError(error_service_1.ErrorCode.USER_EMAIL_AND_ID);
    }
    let foreignUser = false;
    let whereClause;
    if (userId) {
        foreignUser = user.userId !== userId;
        if (foreignUser && !(user.role & users_model_1.UserRoles.ADMIN)) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE);
        }
        whereClause = { userId };
    }
    else if (email) {
        foreignUser = user.email !== email;
        if (foreignUser && !(user.role & users_model_1.UserRoles.ADMIN)) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE);
        }
        whereClause = { email };
    }
    else if (!(user.role & users_model_1.UserRoles.ADMIN)) {
        whereClause = { userId: user.userId };
    }
    else {
        throw new error_service_1.LogicError(error_service_1.ErrorCode.USER_EMAIL_AND_ID);
    }
    return [whereClause, foreignUser];
}
//# sourceMappingURL=users.controller.js.map