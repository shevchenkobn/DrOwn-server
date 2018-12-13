import { TYPES } from '../di/types';
import * as http from 'http';
import * as url from 'url';
import * as SocketIOServer from 'socket.io';
import { inject, injectable } from 'inversify';
import { DroneModel, DroneStatus, IDrone } from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { bindCallbackOnExit } from '../services/util.service';
import {
  DroneMeasurements,
  IDroneMeasurement,
  isDroneMeasurementInput,
} from '../models/drone-measurements';

@injectable()
export class SocketIoController {
  protected _httpServer: http.Server;
  protected _droneModel: DroneModel;
  protected _droneMeasurementModel: DroneMeasurements;
  protected _server: SocketIO.Server;
  // TODO: add sync between nodes
  protected _socketIdToDeviceId: Map<string, string>;
  protected _deviceIdToSocketId: Map<string, string>;
  protected _devices: Map<string, IDrone>;

  constructor(
    // @inject(TYPES.HttpServer) hostConfig: AutobahnServeConfig,
    @inject(TYPES.HttpServer) httpServer: http.Server,
    @inject(TYPES.DroneModel) droneModel: DroneModel,
    @inject(TYPES.DroneMeasurementModel) droneMeasurementModel: DroneMeasurements,

    // errorCallbacks: ErrorCallbacks = {
    //   on_user_error: (err, customErrorMessage) => {
    //     // TODO: add logging
    //     console.error('Autobahn callback error: ', err, customErrorMessage);
    //   },
    //   on_internal_error: (err, customErrorMessage) => {
    //     // TODO: add logging
    //     console.error('Autobahn internal error: ', err, customErrorMessage);
    //   },
    // },
  ) {
    this._httpServer = httpServer;
    this._droneModel = droneModel;
    this._droneMeasurementModel = droneMeasurementModel;

    this._socketIdToDeviceId = new Map<string, string>();
    this._deviceIdToSocketId = new Map<string, string>();
    this._devices = new Map<string, IDrone>();

    this._server = SocketIOServer(httpServer, {
      path: '/socket.io',
      serveClient: true,
      origins: '*',
    });

    this._server.use(async (socket, fn) => {
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

        this._devices.set(deviceId, drone!);
        this._socketIdToDeviceId.set(socket.id, deviceId);
        this._deviceIdToSocketId.set(deviceId, socket.id);
      } catch (err) {
        console.error(err);
        fn(new LogicError(ErrorCode.SERVER)); // Send unknown error
      }
    });

    bindCallbackOnExit(() => this._server.close());

    this.initialize();
  }

  public listen(port: number) {
    this._server.listen(port);
  }

  public close(cb: () => void) {
    this._server.close(cb);
  }

  public disconnect(deviceId: string) {
    this._server.sockets.connected[this._deviceIdToSocketId.get(deviceId)!].disconnect();
  }

  protected initialize() {
    this._server.on('connection', socket => {
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
          console.log(err);
        }
      });

      socket.on('disconnecting', (reason: string) => {
        const deviceId = this._socketIdToDeviceId.get(socket.id)!;
        this._deviceIdToSocketId.delete(deviceId);
        this._devices.delete(deviceId);
        this._socketIdToDeviceId.delete(socket.id);
      });
    });
  }
}
