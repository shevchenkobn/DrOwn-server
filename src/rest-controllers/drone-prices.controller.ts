import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  DronePriceActionType,
  DronePricesModel,
  IDronePrice,
  IDronePriceInput,
} from '../models/drone-prices.model';
import { NextFunction, Request, Response } from 'express';
import { getSafeSwaggerParam, getSortFields } from '../services/util.service';
import { Maybe } from '../@types';
import { DroneModel } from '../models/drones.model';
import { IUser } from '../models/users.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { DbConnection } from '../services/db-connection.class';

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
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as Maybe<[string, string]>;
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
          if (createdAtLimits) {
            query.andWhereBetween('createdAt', createdAtLimits);
          }
          if (actionTypes) {
            query.whereIn('actionType', actionTypes);
          }
          if (priceLimits) {
            query.andWhereBetween('price', priceLimits);
          }
          if (sortings) {
            for (const [column, direction] of sortings) {
              query.orderBy(column, direction);
            }
          }

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

          const drones = await droneModel.select(['ownerId'], {
            droneId: dronePrice.droneId,
            ownerId: user.userId,
          });
          if (drones.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

          dbConnection.knex.transaction(async trx => {
            try {
              await dronePricesModel.table.insert(dronePrice).transacting(trx);
              const newDronePrice = await dronePricesModel.table
                .columns(select)
                .transacting(trx)
                .whereIn(
                  'priceId',
                  dronePricesModel.table.max('priceId'),
                );
              trx.commit(newDronePrice);
              res.json(newDronePrice);
            } catch (err) {
              next(err);
              trx.rollback(err);
            }
          }).catch(err => console.error(err));
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
    };
  }
}
