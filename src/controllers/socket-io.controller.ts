import { TYPES } from '../di/types';
import * as http from 'http';
import * as config from 'config';
import * as url from 'url';
import * as SocketIOServer from 'socket.io';
import { inject, injectable } from 'inversify';
import { DroneModel, DroneStatus, IDrone } from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { bindCallbackOnExit } from '../services/util.service';
import { AuthService } from '../services/authentication.class';

export interface AutobahnConfig {
  route: string;
  defaultRealm: string;
  appPrefix: string;
  authRPC: {
    authId: string;
    droneRole: string;
  };
}

export interface ErrorCallbacks {
  on_user_error: (err: any, customErrorMessage: any) => any;
  on_internal_error: (err: any, customErrorMessage: any) => any;
}

export interface AutobahnServeConfig {
  host: string;
  port: number;
}

@injectable()
export class SocketIoController {
  protected _server: SocketIO.Server;
  protected _socketToDeviceId: Map<string, string>;
  protected _deviceIds: Set<string>;

  constructor(
    // @inject(TYPES.HttpServer) hostConfig: AutobahnServeConfig,
    @inject(TYPES.HttpServer) server: http.Server,
    @inject(TYPES.DroneModel) droneModel: DroneModel,

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
    this._socketToDeviceId = new Map<string, string>();
    this._deviceIds = new Set<string>();

    this._server = SocketIOServer(server, {
      path: '/socket.io',
      serveClient: true,
      origins: '*',
      allowRequest: async (request, callback) => {
        try {
          const req = request as http.IncomingMessage;
          const { password, 'device-id': deviceId } = url.parse(req.url || '', true).query;
          if (!deviceId || !password || Array.isArray(deviceId) || Array.isArray(password)) {
            callback(1, false);
            return;
          }
          let drone: IDrone | null = null;
          try {
            drone = await droneModel.authenticateDrone(deviceId, password);
          } catch (err) {
            callback(2, false);
            return;
          }

          this._deviceIds.add(deviceId);
        } catch (err) {
          console.error(err);
          callback(10, false);
        }
      },
    });

    bindCallbackOnExit(() => this._server.close());
  }
}
