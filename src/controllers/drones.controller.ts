import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import { DroneModel, DroneStatus, IDrone, IDroneInput, WhereClause } from '../models/drones.model';
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

          console.debug(query.toSQL());
          res.json(await query);
        } catch (err) {
          next(err);
        }
      },

      async createDrone(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (
            req as any
          ).user as IUser;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDrone)[];
          const drone = (
            req as any
          ).swagger.params.drone.value as IDroneInput;

          if (!drone.ownerId) {
            if (!(user.role & UserRoles.OWNER)) {
              next(new LogicError(ErrorCode.DRONE_OWNER_NO));
              return;
            }
            drone.ownerId = user.userId;
          }
          if (!drone.producerId) {
            if (user.role & UserRoles.ADMIN && !(user.role & UserRoles.PRODUCER)) {
              next(new LogicError(ErrorCode.DRONE_PRODUCER_NO));
              return;
            }
            drone.producerId = user.userId;
          }

          checkLocation(drone);

          await droneModel.create(drone);
          res.json(
            (await droneModel.select(getColumns(select, true), { deviceId: drone.deviceId }))[0],
          );
        } catch (err) {
          next(err);
        }
      },

      async updateDrone(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (
            req as any
          ).user as IUser;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDrone)[];
          const droneUpdate = (
            req as any
          ).swagger.params.drone.value as IDroneInput;
          const whereClause = getDroneWhereClause(req);

          if (droneUpdate.ownerId && !(user.role & UserRoles.ADMIN)) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }

          const returnDrone = select && select.length > 0;
          const columns = returnDrone ? getColumns(select, true) : [];
          const hadStatus = columns.includes('status');
          if (!hadStatus) {
            columns.push('status');
          }
          const hadOwnerId = columns.includes('ownerId');
          if (!hadOwnerId) {
            columns.push('ownerId');
          }

          const drones = await droneModel.select(columns, whereClause);
          if (drones.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }
          const drone: IDrone = drones[0];

          if (!(user.role & UserRoles.ADMIN) && drone.ownerId !== user.userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          if (drone.status === DroneStatus.UNAUTHORIZED) {
            next(new LogicError(ErrorCode.DRONE_UNAUTHORIZED));
            return;
          }
          if (
            drone.status === DroneStatus.RENTED
            && !(
              'isWritingTelemetry' in drone
              && Object.keys(drone).length === 1
            )
          ) {
            next(new LogicError(ErrorCode.DRONE_RENTED));
            return;
          }

          checkLocation(droneUpdate);

          await droneModel.update(drone, whereClause);
          if (returnDrone) {
            if (!hadOwnerId) {
              delete drone.ownerId;
            }
            if (!hadStatus) {
              delete drone.status;
            }
            res.json(drone);
          } else {
            res.json({});
          }
        } catch (err) {
          next(err);
        }
      },

      async deleteDrone(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (
            req as any
          ).user as IUser;
          const select = (
            req as any
          ).swagger.params.select.value as (keyof IDrone)[];
          const whereClause = getDroneWhereClause(req);

          let drone: IDrone | null = null;
          let hadOwnerId = false;
          if (select && select.length > 0) {
            const columns = getColumns(select, true);
            if (!(user.role & UserRoles.ADMIN)) {
              hadOwnerId = columns.includes('ownerId');
              if (!hadOwnerId) {
                columns.push('ownerId');
              }

              const drones = await droneModel.select(columns, whereClause);
              if (drones.length === 0) {
                next(new LogicError(ErrorCode.NOT_FOUND));
                return;
              }
              drone = drones[0];

              if (drone!.ownerId !== user.userId) {
                next(new LogicError(ErrorCode.AUTH_ROLE));
                return;
              }
            } else {
              const drones = await droneModel.select(columns, whereClause);
              if (drones.length === 0) {
                next(new LogicError(ErrorCode.NOT_FOUND));
                return;
              }
              drone = drones[0];
            }
          } else if (!(user.role & UserRoles.ADMIN)) {
            const drones = await droneModel.select(['ownerId'], whereClause);
            if (drones.length === 0) {
              next(new LogicError(ErrorCode.NOT_FOUND));
              return;
            }

            if (drones[0].ownerId !== user.userId) {
              next(new LogicError(ErrorCode.AUTH_ROLE));
              return;
            }
          }

          await droneModel.delete(whereClause);

          if (drone) {
            if (!hadOwnerId) {
              delete drone.ownerId;
            }
            res.json(drone);
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

function getDroneWhereClause(req: Request): WhereClause {
  const droneId = getSafeSwaggerParam<string>(req, 'drone-id');
  if (droneId) {
    return { droneId };
  }
  const deviceId = getSafeSwaggerParam<string>(req, 'device-id');
  if (deviceId) {
    return { deviceId };
  }
  throw new LogicError(ErrorCode.DRONE_ID_DRONE_DEVICE);
}
