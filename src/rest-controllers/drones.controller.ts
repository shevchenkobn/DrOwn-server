import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  DroneModel,
  DroneStatus,
  IDrone,
  IDroneInput,
  maxPasswordLength,
  WhereClause,
} from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { NextFunction, Request, Response } from 'express';
import { IUser, UserModel, UserRoles } from '../models/users.model';
import { Maybe } from '../@types';
import {
  appendOrderBy,
  getRandomString,
  getSafeSwaggerParam,
  getSortFields,
} from '../services/util.service';
import { AuthService } from '../services/authentication.class';
import { randomBytes } from 'crypto';
import { promisify } from 'util';

@injectable()
export class DronesController {
  constructor(
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.UserModel) userModel: UserModel,
    @inject(TYPES.AuthService) authService: AuthService,
  ) {
    return {
      async getDrones(req: Request, res: Response, next: NextFunction) {
        try {
          let user: IUser | null = null;
          try {
            user = await authService.getUserFromRequest(req);
          } catch {}
          const producerIds = getSafeSwaggerParam<string[]>(req, 'producer-ids');
          const ownerIds = getSafeSwaggerParam<string[]>(req, 'owner-ids');
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
            'engine-power-limits',
          );
          if (enginePowerLimits) {
            enginePowerLimits.sort();
          }
          const loadCapacityLimits = getSafeSwaggerParam<[number, number]>(
            req,
            'load-capacity-limits',
          );
          const statuses = getSafeSwaggerParam<number[]>(
            req,
            'load-capacity-limits',
          );
          if (loadCapacityLimits) {
            loadCapacityLimits.sort();
          }
          const canCarryLiquids = getSafeSwaggerParam<boolean>(req, 'can-carry-liquids');
          const sortings = getSortFields(getSafeSwaggerParam<string[]>(req, 'sort'));

          const query = droneModel.table.columns(getColumns(
            select,
            true,
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
          if (statuses) {
            query.whereIn('status', statuses);
          }
          appendOrderBy(query, sortings);

          console.debug(query.toSQL());
          res.status(201).json(await query);
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

          checkLocation(drone);
          (drone as IDrone).ownerId = user.userId;
          if (typeof drone.baseLongitude !== 'number') {
            drone.baseLongitude = user.longitude;
            drone.baseLatitude = user.latitude;
          }
          if (typeof drone.baseLongitude !== 'number') {
            next(new LogicError(ErrorCode.LOCATION_BAD));
            return;
          }

          await droneModel.create(drone);
          res.json(
            (
              await droneModel.select(getColumns(select, true), { deviceId: drone.deviceId })
            )[0],
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
          const droneFromDB: IDrone = drones[0];

          if (droneFromDB.ownerId !== user.userId) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          if (droneFromDB.status === DroneStatus.UNAUTHORIZED) {
            next(new LogicError(ErrorCode.DRONE_UNAUTHORIZED));
            return;
          }
          if (droneFromDB.status === DroneStatus.RENTED) {
            next(new LogicError(ErrorCode.DRONE_RENTED));
            return;
          }

          checkLocation(droneUpdate);

          if (typeof droneUpdate.status === 'number') {
            if (droneUpdate.status !== DroneStatus.UNAUTHORIZED) {
              next(new LogicError(ErrorCode.DRONE_STATUS_BAD));
              return;
            }
            (droneUpdate as any).passwordHash = null;
          }

          await droneModel.update(droneUpdate, whereClause);
          if (returnDrone) {
            if (!hadOwnerId) {
              delete droneFromDB.ownerId;
            }
            if (!hadStatus) {
              delete droneFromDB.status;
            }
            res.json(droneFromDB);
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

          const affectedRows = await droneModel.delete(whereClause);
          if (affectedRows === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }

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

      async authorizeDrone(req: Request, res: Response, next: NextFunction) {
        try {
          const deviceId = (
            req as any
          ).swagger.params['device-id'].value as string;

          const drones = await droneModel.select(['status'], { deviceId });
          if (drones.length === 0) {
            next(new LogicError(ErrorCode.NOT_FOUND));
            return;
          }
          if (drones[0].status !== DroneStatus.UNAUTHORIZED) {
            next(new LogicError(ErrorCode.DRONE_AUTHORIZED));
            return;
          }

          const password = getRandomString(maxPasswordLength);
          await droneModel.authorize({ deviceId }, password);

          res.json({ deviceId, password });
        } catch (err) {
          next(err);
        }
      },
    };
  }
}

const safeColumns: ReadonlyArray<keyof IDrone> = [
  'droneId',
  'ownerId',
  'status',
  'batteryPower',
  'enginePower',
  'loadCapacity',
  'canCarryLiquids',
];
const adminFields: ReadonlyArray<keyof IDrone> = [
  'deviceId',
  'baseLatitude',
  'baseLongitude',
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
  const droneId = getSafeSwaggerParam<string>(req, 'droneId');
  if (droneId) {
    return { droneId };
  }
  const deviceId = getSafeSwaggerParam<string>(req, 'device-id');
  if (deviceId) {
    return { deviceId };
  }
  throw new LogicError(ErrorCode.DRONE_ID_DRONE_DEVICE);
}
