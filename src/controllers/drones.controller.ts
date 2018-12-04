import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DroneModel, IDrone, IDroneInput } from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { NextFunction, Request, Response } from 'express';
import { IUser, UserRoles } from '../models/users.model';
import { Maybe } from '../@types';
import { getSafeSwaggerParam } from '../services/util.service';

@injectable()
export class DronesController {
  constructor(
    @inject(TYPES.DroneModel) droneModel: DroneModel,
  ) {
    return {
      async getDrones(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (
            req as any
          ).user as IUser;
          const producerIds = getSafeSwaggerParam<string[]>(req, 'producer-ids');
          const ownerIds = getSafeSwaggerParam<string[]>(req, 'producer-ids');
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDrone)[];
          const batteryPowerLimits = getSafeSwaggerParam<[number, number]>(
            req,
            'battery-power-limits',
          );
          if (batteryPowerLimits) {
            batteryPowerLimits.sort();
          }
          const enginePowerLimits = getSafeSwaggerParam<[number, number]>(
            req,
            'battery-power-limits',
          );
          if (enginePowerLimits) {
            enginePowerLimits.sort();
          }
          const loadCapacityLimits = getSafeSwaggerParam<[number, number]>(
            req,
            'battery-power-limits',
          );
          if (loadCapacityLimits) {
            loadCapacityLimits.sort();
          }
          const canCarryLiquids = getSafeSwaggerParam<boolean>(req, 'can-carry-liquids');
          const query = droneModel.table.columns(getColumns(
            select,
            !!(
              user.role & UserRoles.ADMIN
            ) || !!(
              ownerIds && ownerIds.length && ownerIds[0] === user.userId
            ),
          ));
          if (producerIds) { // TODO: Ensure it works properly
            query.whereIn('producerId', producerIds);
          }
          if (ownerIds) { // TODO: Ensure it works properly
            query.whereIn('ownerId', ownerIds);
          }
          if (batteryPowerLimits) {
            query.andWhereBetween('batteryPower', batteryPowerLimits);
          }
          if (enginePowerLimits) {
            query.andWhereBetween('enginePower', enginePowerLimits);
          }
          if (loadCapacityLimits) {
            query.andWhereBetween('loadCapacity', loadCapacityLimits);
          }
          if (typeof canCarryLiquids === 'boolean') {
            query.andWhere({ canCarryLiquids });
          }

          console.log(query.toSQL());
          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async createDrone(req: Request, res: Response, next: NextFunction) {

      },
    };
  }
}

const safeColumns: ReadonlyArray<keyof IDrone> = [
  'droneId',
  'producerId',
  'ownerId',
  'deviceId',
  'status',
  'batteryPower',
  'enginePower',
  'loadCapacity',
  'canCarryLiquids',
];
const adminFields: ReadonlyArray<keyof IDrone> = [
  'baseLatitude',
  'baseLongitude',
  'isWritingTelemetry',
];

function getColumns(columns: Maybe<(keyof IDrone)[]>, includeAdmin: boolean) {
  if (!columns || columns.length === 0) {
    return (
      includeAdmin ? safeColumns.concat(adminFields) : safeColumns
    ) as any;
  }
  return columns.filter(
    column => safeColumns.includes(column)
      || includeAdmin && adminFields.includes(column),
  );
}

function checkLocation(drone: IDroneInput) {
  if ((
    typeof drone.baseLatitude !== 'number'
  ) !== (
    typeof drone.baseLongitude !== 'number'
  )) {
    throw new LogicError(ErrorCode.LOCATION_BAD);
  }
}
