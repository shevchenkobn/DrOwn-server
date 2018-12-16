import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  DronePriceActionType,
  DronePricesModel,
  IDronePrice,
  IDronePriceInput,
} from '../models/drone-prices.model';
import { NextFunction, Request, Response } from 'express';
import { appendOrderBy, getSafeSwaggerParam, getSortFields } from '../services/util.service';
import { Maybe } from '../@types';
import { DroneModel } from '../models/drones.model';
import { IUser, UserRoles, UserStatus } from '../models/users.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { DbConnection } from '../services/db-connection.class';
import { TableName } from '../services/table-names';

@injectable()
export class DronePricesController {
  constructor(
    @inject(TYPES.DronePriceModel) dronePricesModel: DronePricesModel,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.DbConnection) dbConnection: DbConnection,
  ) {
    return {
      async getPrices(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDronePrice)[];
          const priceIds = getSafeSwaggerParam<string[]>(req, 'price-ids');
          const droneIds = getSafeSwaggerParam<string[]>(req, 'drone-ids');
          const createdAtLimits = (getSafeSwaggerParam<string[]>(
            req,
            'created-at-limits',
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as ([Date, Date] | []);
          const actionTypes = getSafeSwaggerParam<DronePriceActionType[]>(req, 'action-types');
          const priceLimits = getSafeSwaggerParam<[number, number]>(req, 'price-limits');
          if (priceLimits) {
            priceLimits.sort();
          }
          const sortings = getSortFields(getSafeSwaggerParam<string[]>(req, 'sort'));

          const query = dronePricesModel.table.columns(select);
          if (priceIds) {
            query.whereIn('priceId', priceIds);
          }
          if (droneIds) {
            query.whereIn('droneId', droneIds);
          }
          if (createdAtLimits.length > 0) {
            query.andWhereBetween('createdAt', createdAtLimits as any);
          }
          if (actionTypes) {
            query.whereIn('actionType', actionTypes);
          }
          if (priceLimits) {
            query.andWhereBetween('price', priceLimits);
          }
          appendOrderBy(query, sortings);

          console.debug(query.toSQL());
          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async createDronePrice(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDronePrice)[];
          const dronePrice = (
            req as any
          ).swagger.params.dronePrice.value as IDronePriceInput;
          const user = (req as any).user as IUser;
          if (user.status === UserStatus.BLOCKED) {
            next(new LogicError(ErrorCode.USER_BLOCKED));
            return;
          }

          const drones = await droneModel.select(['ownerId'], {
            droneId: dronePrice.droneId,
            ownerId: user.userId,
          });
          if (drones.length === 0) {
            next(new LogicError(ErrorCode.DRONE_PRICE_DRONE_BAD));
            return;
          }
          if (
            !(user.role & UserRoles.OWNER) && dronePrice.actionType === DronePriceActionType.SELLING
            || (
              !(user.role & UserRoles.LANDLORD)
              && dronePrice.actionType === DronePriceActionType.RENTING
            )
          ) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

          await dbConnection.knex.transaction(async trx => {
            try {
              await dronePricesModel.update(
                { droneId: dronePrice.droneId, actionType: dronePrice.actionType },
                { isActive: false },
                trx,
              );
              await dronePricesModel.table.insert(dronePrice).transacting(trx);
              res.status(201).json(
                (await dronePricesModel.select(
                  select,
                  { isActive: true, droneId: dronePrice.droneId },
                ))[0],
              );
              trx.commit();
            } catch (err) {
              trx.rollback(err);
            }
          });
        } catch (err) {
          next(err);
        }
      },

      async getPrice(req: Request, res: Response, next: NextFunction) {
        try {
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDronePrice)[];
          const priceId = (
            req as any
          ).swagger.params.priceId.value as string;

          const dronePrices = await dronePricesModel.select(select, { priceId });
          if (dronePrices.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }
          res.json(dronePrices[0]);
        } catch (err) {
          next(err);
        }
      },

      async deactivatePrice(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDronePrice)[];
          const priceId = (
            req as any
          ).swagger.params.priceId.value as string;

          const hasSelect = select && select.length > 0;
          const droneOwnerId = `${TableName.Drones}.ownerId`;
          const columns: string[] = [droneOwnerId];
          if (hasSelect) {
            columns.push(...select!.map(col => `${TableName.DronePrices}.${col}`));
          }
          const dronePrices = await dronePricesModel.table
            .where({ priceId })
            .columns(columns)
            .join(
              TableName.Drones,
              `${TableName.Drones}.droneId`,
              `${TableName.Drones}.droneId`,
            );
          if (dronePrices.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }
          const dronePrice = dronePrices[0];
          if (dronePrices[0][droneOwnerId] !== user.userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

          await dronePricesModel.update({ priceId }, { isActive: false });
          if (hasSelect) {
            const returnPrice = {} as {[column: string]: any};
            for (const column of select) {
              returnPrice[column] = dronePrice[`${TableName.DronePrices}.${column}`];
            }
            res.json(returnPrice);
          } else {
            res.json({});
          }
        } catch (err) {
          next(err);
        }
      },
    };
  }
}
