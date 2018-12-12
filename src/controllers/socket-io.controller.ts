import { TYPES } from '../di/types';
import * as config from 'config';
import * as SocketIO from 'socket.io';
import { inject, injectable } from 'inversify';
import { DroneModel, DroneStatus } from '../models/drones.model';
import { ErrorCode, LogicError } from '../services/error.service';
import { bindCallbackOnExit } from '../services/util.service';

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
  protected _openPromise?: Promise<void>;
  protected _session?: Session;
  protected _details?: any;
  protected _droneModel: DroneModel;
  private _selfConnected = false;
  protected _deviceIds: Map<number, string>;

  constructor(
    @inject(TYPES.ServerConfig) hostConfig: AutobahnServeConfig,
    @inject(TYPES.DroneModel) droneModel: DroneModel,

    errorCallbacks: ErrorCallbacks = {
      on_user_error: (err, customErrorMessage) => {
        // TODO: add logging
        console.error('Autobahn callback error: ', err, customErrorMessage);
      },
      on_internal_error: (err, customErrorMessage) => {
        // TODO: add logging
        console.error('Autobahn internal error: ', err, customErrorMessage);
      },
    },
  ) {

    this._droneModel = droneModel;
    this._server = new Connection({
      ...errorCallbacks,
      use_es6_promises: true,
      url: `ws://${hostConfig.host}:${hostConfig.port}${autobahnConfig.route}`,
      realm: autobahnConfig.defaultRealm,

      // properties for loopback login (shit in library)
      authid: autobahnConfig.authRPC.authId,
      authmethods: ['wampcra'],
      onchallenge: this.onChallenge,
    });

    this._deviceIds = new Map<number, string>();

    bindCallbackOnExit(() => this._server.close('closed', 'Process exit'));
  }

  public set onclose(onclose) {
    this._server.onclose = onclose;
  }

  public get onclose() {
    return this._server.onclose;
  }

  public open() {
    if (this._openPromise) {
      return this._openPromise;
    }
    this._openPromise = new Promise<void>((resolve, reject) => {
      this._server.onopen = (session, details) => {
        this._session = session;
        this._details = details;

        // registering auth procedure
        session.register(`${autobahnConfig.appPrefix}.authenticate`, this.authenticate as any);

        this.initializeSession();

        resolve();
      };
      this._server.open();
    });
    return this._openPromise;
  }

  public sendOrder() {
    // TODO: call `${prefix}.executeOrder` and return the result
  }

  private initializeSession() {
    const prefix = autobahnConfig.appPrefix;
    const session = this._session!;
    const details = this._details!;

    // NOTE: drone must implement `${prefix}.executeOrder` function and return OrderResult enum
    session.subscribe(`${prefix}.telemetry`, ([data]: [any], kwargs, options) => {
      if (!options || typeof options.publisher !== 'number') { // TODO: delete when debugged
        throw new TypeError('options is null wtf?');
      }
      const deviceId = this._deviceIds.get(options.publisher);
      // TODO: save the `data`
    }, { get_retained: true });

    session.subscribe(`${prefix}.state-change`, ([data]: [any], kwargs, options) => {
      if (!options || typeof options.publisher !== 'number') { // TODO: delete when debugged
        throw new TypeError('options is null wtf?');
      }
      const deviceId = this._deviceIds.get(options.publisher);
      // TODO: notify or save notification about the change
    }, { get_retained: true });
  }

  private authenticate = async (
    [realm, authId, details]: [string, string, any],
  ): Promise<{ secret: string, role: string }> => {
    if (authId === autobahnConfig.authRPC.authId) {
      if (this._selfConnected) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }
      return { secret: autobahnConfig.authRPC.authId, role: autobahnConfig.authRPC.authId };
    }

    const drones = await this._droneModel.select(['status', 'passwordHash'], { deviceId: authId });
    if (drones.length === 0) {
      throw new LogicError(ErrorCode.NOT_FOUND);
    }
    if (drones[0].status === DroneStatus.UNAUTHORIZED) {
      throw new LogicError(ErrorCode.DRONE_UNAUTHORIZED);
    }
    if (drones[0].status !== DroneStatus.OFFLINE) {
      // TODO: logging
      console.error('Duplicate login for drone');
      throw new LogicError(ErrorCode.DRONE_STATUS_BAD);
    }

    return { secret: drones[0].passwordHash, role: autobahnConfig.authRPC.droneRole };
  }

  private onChallenge = (session: Session, method: string, extra: any) => {
    if (method !== 'wampcra') {
      throw new TypeError('undefined wamp auth method');
    }

    this._selfConnected = true;
    return auth_cra.sign(autobahnConfig.authRPC.authId, extra.challenge);
  }
}
