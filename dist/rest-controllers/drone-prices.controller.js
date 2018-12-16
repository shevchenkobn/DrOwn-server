"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const types_1 = require("../di/types");
const inversify_1 = require("inversify");
const drone_prices_model_1 = require("../models/drone-prices.model");
const util_service_1 = require("../services/util.service");
const drones_model_1 = require("../models/drones.model");
const users_model_1 = require("../models/users.model");
const error_service_1 = require("../services/error.service");
const db_connection_class_1 = require("../services/db-connection.class");
const table_names_1 = require("../services/table-names");
let DronePricesController = class DronePricesController {
    constructor(dronePricesModel, droneModel, dbConnection) {
        return {
            async getPrices(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const priceIds = util_service_1.getSafeSwaggerParam(req, 'price-ids');
                    const droneIds = util_service_1.getSafeSwaggerParam(req, 'drone-ids');
                    const createdAtLimits = (util_service_1.getSafeSwaggerParam(req, 'created-at-limits') || []).map(dateStr => new Date(dateStr)).sort();
                    const actionTypes = util_service_1.getSafeSwaggerParam(req, 'action-types');
                    const priceLimits = util_service_1.getSafeSwaggerParam(req, 'price-limits');
                    if (priceLimits) {
                        priceLimits.sort();
                    }
                    const sortings = util_service_1.getSortFields(util_service_1.getSafeSwaggerParam(req, 'sort'));
                    const query = dronePricesModel.table.columns(select);
                    if (priceIds) {
                        query.whereIn('priceId', priceIds);
                    }
                    if (droneIds) {
                        query.whereIn('droneId', droneIds);
                    }
                    if (createdAtLimits.length > 0) {
                        query.andWhereBetween('createdAt', createdAtLimits);
                    }
                    if (actionTypes) {
                        query.whereIn('actionType', actionTypes);
                    }
                    if (priceLimits) {
                        query.andWhereBetween('price', priceLimits);
                    }
                    util_service_1.appendOrderBy(query, sortings);
                    console.debug(query.toSQL());
                    res.json(await query);
                }
                catch (err) {
                    next(err);
                }
            },
            async createDronePrice(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const dronePrice = req.swagger.params.dronePrice.value;
                    const user = req.user;
                    if (user.status === users_model_1.UserStatus.BLOCKED) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.USER_BLOCKED));
                        return;
                    }
                    const drones = await droneModel.select(['ownerId'], {
                        droneId: dronePrice.droneId,
                        ownerId: user.userId,
                    });
                    if (drones.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_PRICE_DRONE_BAD));
                        return;
                    }
                    if (!(user.role & users_model_1.UserRoles.OWNER) && dronePrice.actionType === drone_prices_model_1.DronePriceActionType.SELLING
                        || (!(user.role & users_model_1.UserRoles.LANDLORD)
                            && dronePrice.actionType === drone_prices_model_1.DronePriceActionType.RENTING)) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    await dbConnection.knex.transaction(async (trx) => {
                        try {
                            await dronePricesModel.update({ droneId: dronePrice.droneId, actionType: dronePrice.actionType }, { isActive: false }, trx);
                            await dronePricesModel.table.insert(dronePrice).transacting(trx);
                            res.status(201).json((await dronePricesModel.select(select, { isActive: true, droneId: dronePrice.droneId }))[0]);
                            trx.commit();
                        }
                        catch (err) {
                            trx.rollback(err);
                        }
                    });
                }
                catch (err) {
                    next(err);
                }
            },
            async getPrice(req, res, next) {
                try {
                    const select = req.swagger.params.select.value;
                    const priceId = req.swagger.params.priceId.value;
                    const dronePrices = await dronePricesModel.select(select, { priceId });
                    if (dronePrices.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    res.json(dronePrices[0]);
                }
                catch (err) {
                    next(err);
                }
            },
            async deactivatePrice(req, res, next) {
                try {
                    const user = req.user;
                    const select = req.swagger.params.select.value;
                    const priceId = req.swagger.params.priceId.value;
                    const hasSelect = select && select.length > 0;
                    const droneOwnerId = `${table_names_1.TableName.Drones}.ownerId`;
                    const columns = [droneOwnerId];
                    if (hasSelect) {
                        columns.push(...select.map(col => `${table_names_1.TableName.DronePrices}.${col}`));
                    }
                    const dronePrices = await dronePricesModel.table
                        .where({ priceId })
                        .columns(columns)
                        .join(table_names_1.TableName.Drones, `${table_names_1.TableName.Drones}.droneId`, `${table_names_1.TableName.Drones}.droneId`);
                    if (dronePrices.length === 0) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND));
                        return;
                    }
                    const dronePrice = dronePrices[0];
                    if (dronePrices[0][droneOwnerId] !== user.userId) {
                        next(new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_ROLE));
                        return;
                    }
                    await dronePricesModel.update({ priceId }, { isActive: false });
                    if (hasSelect) {
                        const returnPrice = {};
                        for (const column of select) {
                            returnPrice[column] = dronePrice[`${table_names_1.TableName.DronePrices}.${column}`];
                        }
                        res.json(returnPrice);
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
DronePricesController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.DronePriceModel)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__param(2, inversify_1.inject(types_1.TYPES.DbConnection)),
    tslib_1.__metadata("design:paramtypes", [drone_prices_model_1.DronePricesModel,
        drones_model_1.DroneModel,
        db_connection_class_1.DbConnection])
], DronePricesController);
exports.DronePricesController = DronePricesController;
//# sourceMappingURL=drone-prices.controller.js.map