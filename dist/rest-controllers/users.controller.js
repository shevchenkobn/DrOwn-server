"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const users_model_1 = require("../models/users.model");
const error_service_1 = require("../services/error.service");
const util_service_1 = require("../services/util.service");
const table_schemas_service_1 = require("../services/table-schemas.service");
const table_names_1 = require("../services/table-names");
const db_connection_class_1 = require("../services/db-connection.class");
let UsersController = class UsersController {
    constructor(userModel, dbConnection) {
        return {
            async getUsers(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const user = req.user;
                    const columns = getColumns(select, true);
                    if (select && columns.length < select.length) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.SELECT_BAD));
                        return;
                    }
                    const phoneQuery = util_service_1.getSafeSwaggerParam(req, 'phone-query');
                    if (phoneQuery && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_FILTER_BAD));
                        return;
                    }
                    const longitudeLimits = util_service_1.getSafeSwaggerParam(req, 'longitude-limits');
                    if (longitudeLimits && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_FILTER_BAD));
                        return;
                    }
                    const latitudeLimits = util_service_1.getSafeSwaggerParam(req, 'latitude-limits');
                    if (latitudeLimits && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_FILTER_BAD));
                        return;
                    }
                    const userIds = util_service_1.getSafeSwaggerParam(req, 'user-ids');
                    const emailQuery = util_service_1.getSafeSwaggerParam(req, 'email-query');
                    const roles = util_service_1.getSafeSwaggerParam(req, 'roles');
                    const nameQuery = util_service_1.getSafeSwaggerParam(req, 'name-query');
                    const addressQuery = util_service_1.getSafeSwaggerParam(req, 'address-query');
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'), table_names_1.TableName.Users, adminFields);
                    const query = userModel.table.columns(columns);
                    if (userIds) {
                        query.whereIn('userId', userIds);
                    }
                    if (roles) {
                        query.whereIn('role', roles);
                    }
                    if (nameQuery) {
                        util_service_1.appendLikeQuery(dbConnection.knex, query, 'name', nameQuery);
                    }
                    if (emailQuery) {
                        util_service_1.appendLikeQuery(dbConnection.knex, query, 'email', emailQuery);
                    }
                    if (addressQuery) {
                        util_service_1.appendLikeQuery(dbConnection.knex, query, 'address', addressQuery);
                    }
                    if (phoneQuery) {
                        util_service_1.appendLikeQuery(dbConnection.knex, query, 'phoneNumber', phoneQuery);
                    }
                    if (latitudeLimits) {
                        query.andWhereBetween('latitude', latitudeLimits);
                    }
                    if (longitudeLimits) {
                        query.andWhereBetween('longitude', longitudeLimits);
                    }
                    util_service_1.appendOrderBy(query, sortings);
                    console.debug(query.toQuery());
                    res.json(await query);
                }
                catch (err) {
                    next(err);
                }
            },
            async getUser(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const userId = util_service_1.getSafeSwaggerParam(req, 'userId');
                    if (!(user.role & users_model_1.UserRoles.ADMIN) && user.userId !== userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const users = await userModel.select(getColumns(select, true), { userId });
                    if (users.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    res.json(users[0]);
                }
                catch (err) {
                    next(err);
                }
            },
            async getProfile(req, res) {
                const select = req.swagger.params.select.value;
                const user = req.user;
                res.json(util_service_1.mapObject(user, getColumns(select, true)));
            },
            async createUser(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const inputUser = req.swagger.params.user.value;
                    const user = req.user;
                    const noPassword = !inputUser.password;
                    const selectPassword = select && select.includes('password');
                    if (noPassword && !(!select || selectPassword)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_PASSWORD_SAVE_NO));
                        return;
                    }
                    if (!noPassword && selectPassword) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.SELECT_BAD));
                        return;
                    }
                    util_service_1.checkLocation(inputUser);
                    if (!inputUser.password) {
                        inputUser.password = util_service_1.getRandomString(users_model_1.maxPasswordLength);
                    }
                    await userModel.create(inputUser, true);
                    const newUser = (await userModel.select(getColumns(select, true), { email: inputUser.email }))[0];
                    if (noPassword) {
                        newUser.password = inputUser.password;
                    }
                    res.status(201).json(newUser);
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
                    if (inputUser.role & users_model_1.UserRoles.ADMIN && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const [whereClause, foreignUser] = getUserWhereClause(userId, email, user);
                    if (foreignUser && !(user.role & users_model_1.UserRoles.ADMIN)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const whereHasEmail = 'email' in whereClause;
                    if (!(inputUser.role & users_model_1.UserRoles.ADMIN)
                        && !whereHasEmail
                        && userId === table_schemas_service_1.superAdminUserId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    const passwordUpdated = inputUser.password === '';
                    const selectPassword = select && select.length > 0 && select.includes('password');
                    if (passwordUpdated) {
                        inputUser.password = util_service_1.getRandomString(users_model_1.maxPasswordLength);
                        if (!selectPassword) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_PASSWORD_SAVE_NO));
                            return;
                        }
                    }
                    else if (selectPassword) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.SELECT_BAD));
                        return;
                    }
                    util_service_1.checkLocation(inputUser);
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
                    const hasEmailInWhere = 'email' in whereClause;
                    if (user.role & users_model_1.UserRoles.ADMIN
                        && !hasEmailInWhere
                        && whereClause.userId === table_schemas_service_1.superAdminUserId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    let oldUser = null;
                    if (select && select.length > 0) {
                        const columns = getColumns(select, true);
                        const hadUserIdColumn = hasEmailInWhere && columns.includes('userId');
                        if (hasEmailInWhere && !hadUserIdColumn) {
                            columns.push('userId');
                        }
                        if (foreignUser) {
                            const users = await userModel.select(columns, whereClause);
                            if (users.length === 0) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                                return;
                            }
                            oldUser = users[0];
                            if (hasEmailInWhere) {
                                if (oldUser.userId === table_schemas_service_1.superAdminUserId) {
                                    next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                                    return;
                                }
                                if (!hadUserIdColumn) {
                                    delete oldUser.userId;
                                }
                            }
                        }
                        else {
                            if (hasEmailInWhere && user.userId === table_schemas_service_1.superAdminUserId) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                                return;
                            }
                            oldUser = util_service_1.mapObject(user, columns);
                        }
                    }
                    else if (hasEmailInWhere && user.role & users_model_1.UserRoles.ADMIN) {
                        if (foreignUser) {
                            const users = await userModel.select(['userId'], whereClause);
                            if (users.length === 0) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                                return;
                            }
                            if (users[0].userId === table_schemas_service_1.superAdminUserId) {
                                next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                                return;
                            }
                        }
                        else if (user.userId === table_schemas_service_1.superAdminUserId) {
                            next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                            return;
                        }
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
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [users_model_1.UserModel,
        db_connection_class_1.DbConnection])
], UsersController);
exports.UsersController = UsersController;
const safeColumns = [
    'userId',
    'email',
    'role',
    'name',
];
const adminFields = [
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
        throw new error_service_1.LogicError(error_service_1.ErrorCode.USER_ID_EMAIL);
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
        throw new error_service_1.LogicError(error_service_1.ErrorCode.USER_ID_EMAIL);
    }
    return [whereClause, foreignUser];
}
//# sourceMappingURL=users.controller.js.map