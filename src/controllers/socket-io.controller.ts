import { TYPES } from '../di/types';
import * as http from 'http';
import * as url from 'url';
import * as SocketIOServer from 'socket.io';
import { inject, injectable } from 'inversify';
import { DroneModel, DroneStatus, IDrone } from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { bindOnExitHandler } from '../services/util.service';
import * as BBPromise from 'bluebird';
import {
  DroneMeasurementsModel,
  isDroneMeasurementInput,
} from '../models/drone-measurements.model';
import {
  DroneOrdersModel,
  DroneOrderStatus,
  IDroneOrder,
  isOrderStatus,
  isOrderId,
} from '../models/drone-orders.model';
import { DbConnection } from '../services/db-connection.class';

@injectable()
export class SocketIoController {
  protected _httpServer: http.Server;
  protected _droneModel: DroneModel;
  protected _droneMeasurementModel: DroneMeasurementsModel;
  protected _droneOrderModel: DroneOrdersModel;
  protected _dbConnection: DbConnection;
  protected _nsp: SocketIO.Namespace;
  // TODO: add sync between nodes
  protected _socketIdToDeviceId: Map<string, string>;
  protected _deviceIdToSocketId: Map<string, string>;
  protected _devices: Map<string, IDrone>;

  constructor(
    @inject(TYPES.HttpServer) httpServer: http.Server,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.DroneMeasurementModel) droneMeasurementModel: DroneMeasurementsModel,
    @inject(TYPES.DroneOrderModel) droneOrderModel: DroneOrdersModel,
    @inject(TYPES.DbConnection) dbConnection: DbConnection,
  ) {
    this._httpServer = httpServer;
    this._droneModel = droneModel;
    this._droneOrderModel = droneOrderModel;
    this._droneMeasurementModel = droneMeasurementModel;
    this._dbConnection = dbConnection;

    this._socketIdToDeviceId = new Map<string, string>();
    this._deviceIdToSocketId = new Map<string, string>();
    this._devices = new Map<string, IDrone>();

    this._nsp = SocketIOServer(httpServer, {
      path: '/socket.io',
      serveClient: true,
    }).of('/drones');

    this._nsp.use(async (socket, fn) => {
      try {
        const req = socket.request as http.IncomingMessage;
        const { password, 'device-id': deviceId } = url.parse(req.url || '', true).query;
        if (!deviceId || !password || Array.isArray(deviceId) || Array.isArray(password)) {
          fn(new LogicError(ErrorCode.DRONE_DEVICE_ID_PASSWORD));
          return;
        }
        let drone: IDrone | null = null;
        try {
          drone = await droneModel.authenticateDrone(deviceId, password);
        } catch (err) {
          fn(new LogicError(ErrorCode.AUTH_BAD));
          return;
        }
        if (drone!.status !== DroneStatus.OFFLINE) {
          fn(new LogicError(ErrorCode.DRONE_STATUS_BAD));
          return;
        }
        await droneModel.update({ status: DroneStatus.IDLE } as any, { deviceId });

        // const socketId = getSocketId(socket);
        this._devices.set(deviceId, drone!);
        this._socketIdToDeviceId.set(socket.id, deviceId);
        this._deviceIdToSocketId.set(deviceId, socket.id);
        fn();
      } catch (err) {
        console.error(err);
        fn(new LogicError(ErrorCode.SERVER)); // Send unknown error
      }
    });

    bindOnExitHandler(() => this._nsp.server.close());

    this.initialize();
  }

  public listen(port: number) {
    return this._nsp.server.listen(port);
  }

  public close(cb?: () => void) {
    return this._nsp.server.close(cb);
  }

  public disconnect(deviceId: string, safe = false) {
    const socketId = this._deviceIdToSocketId.get(deviceId);
    if (!socketId) {
      if (!safe) {
        throw new Error(`No connected device for ${deviceId}`);
      }
      return;
    }
    this._nsp.sockets[socketId].disconnect();
    console.debug(Object.keys(this._nsp.server.sockets));
  }

  public sendOrder(order: IDroneOrder) {
    return new Promise<DroneOrderStatus>((resolve, reject) => {
      const socketId = this._deviceIdToSocketId.get(order.deviceId);
      if (!socketId) {
        reject(new Error(`No connected device for ${order.deviceId}`));
        return;
      }

      if (!order.droneOrderId) {
        reject(new Error('No droneOrderId'));
        return;
      }
      const { deviceId, status, ...orderInfo } = order;
      this._nsp.sockets[socketId].emit('order', orderInfo, (status: unknown) => {
        if (!isOrderStatus(status)) {
          reject(new Error(`Not a valid order acceptance status ${status}`));
          return;
        }
        this.saveOrderStatus(orderInfo.droneOrderId, status, deviceId).then(() => {
          resolve(status);
        }).catch(reject);
      });
    });
  }

  protected initialize() {
    this._nsp.on('connection', async socket => {
      socket.on('telemetry', async (data: unknown) => {
        if (!isDroneMeasurementInput(data)) {
          return;
        }
        const deviceId = this._socketIdToDeviceId.get(socket.id);
        if (!deviceId) {
          return;
        }
        try {
          await this._droneMeasurementModel.save(deviceId, data);
        } catch (err) {
          console.error(err);
        }
      });

      socket.on('order-change', async (droneOrderId: unknown, status: unknown) => {
        const deviceId = this._socketIdToDeviceId.get(socket.id)!;
        if (!isOrderId(droneOrderId)) {
          console.error(new Error(`Not a valid order id ${droneOrderId}`));
          return;
        }
        if (!isOrderStatus(status)) {
          console.error(new Error(`Not a valid order acceptance status ${status}`));
          return;
        }
        try {
          await this.saveOrderStatus(droneOrderId, status, deviceId);
        } catch (err) {
          console.error(err);
        }
      });

      socket.on('disconnecting', async (reason: string) => {
        const deviceId = this._socketIdToDeviceId.get(socket.id)!;
        this._deviceIdToSocketId.delete(deviceId);
        this._devices.delete(deviceId);
        this._socketIdToDeviceId.delete(socket.id);

        this._droneModel.update({ status: DroneStatus.OFFLINE } as any, { deviceId });
      });
    });
  }

  private saveOrderStatus(
    droneOrderId: string,
    status: DroneOrderStatus,
    deviceId: string,
  ): BBPromise<boolean> {
    return this._dbConnection.knex.transaction(trx => {
      this._droneOrderModel.table
        .transacting(trx)
        .where({ droneOrderId })
        .update({ status }).then(affected => {
          if (affected === 0) {
            trx.rollback(new Error(`Drone order with ${droneOrderId} id not found`));
            return;
          }
          this._droneModel.table
            .transacting(trx)
            .where({ deviceId })
            .update({
              status: isIdleOrderStatus(status) ? DroneStatus.IDLE : DroneStatus.WORKING,
            }).then(affected => {
              if (affected === 0) {
                trx.rollback(new Error(`Drone with ${deviceId} device id not found`));
                return;
              }
              trx.commit(true);
            });
        });
    });
  }
}

function isIdleOrderStatus(status: DroneOrderStatus) {
  return status !== DroneOrderStatus.ENQUEUED && status !== DroneOrderStatus.STARTED;
}

function getSocketId(socket: SocketIO.Socket) {
  return socket.id.includes('#') ? socket.id.split('#')[1] : socket.id;
}
