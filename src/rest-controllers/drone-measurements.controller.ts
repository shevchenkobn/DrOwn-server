import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { NextFunction, Request, Response } from 'express';
import { IUser } from '../models/users.model';
import { appendOrderBy, getSafeSwaggerParam, getSortFields } from '../services/util.service';
import {
  DroneMeasurementsModel,
  DroneRealtimeStatus,
  IDroneMeasurement,
} from '../models/drone-measurements.model';
import { DroneModel } from '../models/drones.model';

@injectable()
export class DroneMeasurementsController {
  constructor(
    @inject(TYPES.DroneMeasurementModel) droneMeasurementsModel: DroneMeasurementsModel,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
  ) {
    return {
      async getMeasurements(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const select = (req as any).swagger.params.select.value as (keyof IDroneMeasurement)[];

          const deviceIds = getSafeSwaggerParam<string[]>(req, 'device-ids');
          const statuses = getSafeSwaggerParam<DroneRealtimeStatus[]>(req, 'statuses');
          const createdAtLimits = (getSafeSwaggerParam<string[]>(
            req,
            'created-at-limits',
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as ([Date, Date] | []);
          const longitudeLimits = getSafeSwaggerParam<[number, number]>(req, 'longitude-limits');
          const latitudeLimits = getSafeSwaggerParam<[number, number]>(req, 'latitude-limits');
          const batteryPowerLimits = getSafeSwaggerParam<[number, number]>(
            req,
            'battery-power-limits',
          );
          const batteryChargeLimits = getSafeSwaggerParam<[number, number]>(
            req,
            'battery-charge-limits',
          );
          const sortings = getSortFields(
            getSafeSwaggerParam<(keyof IDroneMeasurement)[]>(req, 'sort'),
          );

          const query = droneMeasurementsModel.table
            .columns(select)
            .whereIn('deviceId', droneModel.getOwnershipLimiterClause(user));

          if (deviceIds) {
            query.whereIn('deviceId', deviceIds);
          }
          if (statuses) {
            query.whereIn('status', statuses);
          }
          if (batteryChargeLimits) {
            query.andWhereBetween('batteryCharge', batteryChargeLimits);
          }
          if (batteryPowerLimits) {
            query.andWhereBetween('batteryPower', batteryPowerLimits);
          }
          if (longitudeLimits) {
            query.andWhereBetween('longitude', longitudeLimits);
          }
          if (latitudeLimits) {
            query.andWhereBetween('latitude', latitudeLimits);
          }
          if (createdAtLimits.length > 0) {
            query.andWhereBetween('createdAt', createdAtLimits as any);
          }
          appendOrderBy(query, sortings);

          console.debug(query.toQuery());
          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async deleteMeasurements(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const deviceIds = getSafeSwaggerParam<string[]>(req, 'device-ids')!;
          const createdAtLimits = getSafeSwaggerParam<string[]>(
            req,
            'created-at-limits',
          )!.map(dateStr => new Date(dateStr)).sort() as [Date, Date];

          const query = droneMeasurementsModel.table
            .whereIn('deviceId', droneModel.getOwnershipLimiterClause(user))
            .whereIn('deviceId', deviceIds)
            .andWhereBetween('createdAt', createdAtLimits)
            .delete();

          console.debug(query.toQuery());
          await query;
          res.json({});
        } catch (err) {
          next(err);
        }
      },
    };
  }
}
