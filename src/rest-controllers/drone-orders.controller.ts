import { TYPES } from '../di/types';
import { inject, injectable } from 'inversify';
import {
  DroneOrderAction,
  DroneOrdersModel,
  DroneOrderStatus,
  IDroneOrder,
} from '../models/drone-orders.model';
import { NextFunction, Request, Response } from 'express';
import { IUser } from '../models/users.model';
import { appendOrderBy, getSafeSwaggerParam, getSortFields, mapObject } from '../services/util.service';
import { DroneModel, DroneStatus } from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { SocketIoController } from '../controllers/socket-io.controller';
import { TableName } from '../services/table-names';

@injectable()
export class DroneOrdersController {
  constructor(
    @inject(TYPES.DroneOrderModel) droneOrderModel: DroneOrdersModel,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.SocketIoController) socketIoController: SocketIoController,
  ) {
    return {
      async getDroneOrders(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;
          const select = (req as any).swagger.params.select.value as (keyof IDroneOrder)[];

          const droneOrderIds = getSafeSwaggerParam<string[]>(req, 'drone-order-ids');
          const deviceIds = getSafeSwaggerParam<string[]>(req, 'device-ids');
          const userIds = getSafeSwaggerParam<string[]>(req, 'user-ids');
          const actions = getSafeSwaggerParam<DroneOrderAction[]>(req, 'actions');
          const statuses = getSafeSwaggerParam<DroneOrderStatus[]>(req, 'statuses');
          const createdAtLimits = (getSafeSwaggerParam<string[]>(
            req,
            'created-at-limits',
          ) || []).map(dateStr => new Date(dateStr)).sort() as any as ([Date, Date] | []);
          const longitudeLimits = getSafeSwaggerParam<[number, number]>(req, 'longitude-limits');
          const latitudeLimits = getSafeSwaggerParam<[number, number]>(req, 'latitude-limits');
          const sortings = getSortFields(getSafeSwaggerParam<(keyof IDroneOrder)[]>(req, 'sort'));

          const query = droneOrderModel.table
            .columns(select)
            .whereIn('deviceId', droneModel.getOwnershipLimiterClause(user));

          if (droneOrderIds) {
            query.whereIn('deviceOrderId', droneOrderIds);
          }
          if (deviceIds) {
            query.whereIn('deviceId', deviceIds);
          }
          if (userIds) {
            query.whereIn('userId', userIds);
          }
          if (actions) {
            query.whereIn('action', actions);
          }
          if (statuses) {
            query.whereIn('status', statuses);
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

      async sendOrder(req: Request, res: Response, next: NextFunction) {
        try {
          const user = (req as any).user as IUser;

          const select = (req as any).swagger.params.select.value as (keyof IDroneOrder)[];
          const droneOrder = (req as any).swagger.params.droneOrder.value as IDroneOrder;

          if (
            droneOrder.action !== DroneOrderAction.MOVE_TO_LOCATION
            && (
              typeof droneOrder.latitude === 'number'
              || typeof droneOrder.longitude === 'number'
            )
          ) {
            next(new LogicError(ErrorCode.DRONE_ORDER_ACTION_BAD));
            return;
          }
          if (
            droneOrder.action === DroneOrderAction.MOVE_TO_LOCATION
            && !(
              typeof droneOrder.latitude === 'number'
              && typeof droneOrder.longitude === 'number'
            )
          ) {
            next(new LogicError(ErrorCode.LOCATION_BAD));
            return;
          }

          const query = droneModel.getOwnershipLimiterClause(user)
            .columns('deviceId', 'status')
            .where('deviceId', droneOrder.deviceId);
          const drones = await query;
          if (drones.length !== 1) {
            next(new LogicError(ErrorCode.AUTH_ROLE));
            return;
          }
          if (drones[0].status === DroneStatus.UNAUTHORIZED) {
            next(new LogicError(ErrorCode.DRONE_UNAUTHORIZED));
            return;
          }
          if (drones[0].status === DroneStatus.OFFLINE) {
            next(new LogicError(ErrorCode.DRONE_STATUS_BAD));
            return;
          }

          await droneOrderModel.table.insert(droneOrder);
          const order = (await droneOrderModel.table
                .where('deviceId', droneOrder.deviceId)
                .whereIn('createdAt', function () {
                  this.from(TableName.DroneOrders)
                    .max('createdAt')
                    .where('deviceId', droneOrder.deviceId);
                }))[0];
          socketIoController.sendOrder(order).catch(err => {
            console.log('didn\'t send order:', order, err);
          });
          if (select && select.length > 0) {
            res.status(201).json(mapObject(order, select));
          } else {
            res.status(201).json({});
          }
        } catch (err) {
          next(err);
        }
      },
    };
  }
}
