"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
var _a;
"use strict";
const types_1 = require("../di/types");
const config = require("config");
const inversify_1 = require("inversify");
const autobahn_1 = require("autobahn");
const drones_model_1 = require("../models/drones.model");
const error_service_1 = require("../services/error.service");
const util_service_1 = require("../services/util.service");
const autobahnConfig = config.get('autobahn');
let AutobahnController = class AutobahnController {
    constructor(hostConfig, droneModel, errorCallbacks = {
        on_user_error: (err, customErrorMessage) => {
            // TODO: add logging
            console.error('Autobahn callback error: ', err, customErrorMessage);
        },
        on_internal_error: (err, customErrorMessage) => {
            // TODO: add logging
            console.error('Autobahn internal error: ', err, customErrorMessage);
        },
    }) {
        this._selfConnected = false;
        this.authenticate = async ([realm, authId, details]) => {
            if (authId === autobahnConfig.authRPC.authId) {
                if (this._selfConnected) {
                    throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
                }
                return { secret: autobahnConfig.authRPC.authId, role: autobahnConfig.authRPC.authId };
            }
            const drones = await this._droneModel.select(['status', 'passwordHash'], { deviceId: authId });
            if (drones.length === 0) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.NOT_FOUND);
            }
            if (drones[0].status === drones_model_1.DroneStatus.UNAUTHORIZED) {
                throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_UNAUTHORIZED);
            }
            if (drones[0].status !== drones_model_1.DroneStatus.OFFLINE) {
                // TODO: logging
                console.error('Duplicate login for drone');
                throw new error_service_1.LogicError(error_service_1.ErrorCode.DRONE_STATUS_BAD);
            }
            return { secret: drones[0].passwordHash, role: autobahnConfig.authRPC.droneRole };
        };
        this.onChallenge = (session, method, extra) => {
            if (method !== 'wampcra') {
                throw new TypeError('undefined wamp auth method');
            }
            this._selfConnected = true;
            return autobahn_1.auth_cra.sign(autobahnConfig.authRPC.authId, extra.challenge);
        };
        this._droneModel = droneModel;
        this._connection = new autobahn_1.Connection({
            ...errorCallbacks,
            use_es6_promises: true,
            url: `ws://${hostConfig.host}:${hostConfig.port}${autobahnConfig.route}`,
            realm: autobahnConfig.defaultRealm,
            // properties for loopback login (shit in library)
            authid: autobahnConfig.authRPC.authId,
            authmethods: ['wampcra'],
            onchallenge: this.onChallenge,
        });
        this._deviceIds = new Map();
        util_service_1.bindCallbackOnExit(() => this._connection.close('closed', 'Process exit'));
    }
    get [(_a = types_1.ASYNC_INIT, types_1.ASYNC_INIT)]() {
        return this.open();
    }
    set onclose(onclose) {
        this._connection.onclose = onclose;
    }
    get onclose() {
        return this._connection.onclose;
    }
    open() {
        if (this._openPromise) {
            return this._openPromise;
        }
        this._openPromise = new Promise((resolve, reject) => {
            this._connection.onopen = (session, details) => {
                this._session = session;
                this._details = details;
                // registering auth procedure
                session.register(`${autobahnConfig.appPrefix}.authenticate`, this.authenticate);
                this.initializeSession();
                resolve();
            };
            this._connection.open();
        });
        return this._openPromise;
    }
    sendOrder() {
        // TODO: call `${prefix}.executeOrder` and return the result
    }
    initializeSession() {
        const prefix = autobahnConfig.appPrefix;
        const session = this._session;
        const details = this._details;
        // NOTE: drone must implement `${prefix}.executeOrder` function and return OrderResult enum
        session.subscribe(`${prefix}.telemetry`, ([data], kwargs, options) => {
            if (!options || typeof options.publisher !== 'number') { // TODO: delete when debugged
                throw new TypeError('options is null wtf?');
            }
            const deviceId = this._deviceIds.get(options.publisher);
            // TODO: save the `data`
        }, { get_retained: true });
        session.subscribe(`${prefix}.state-change`, ([data], kwargs, options) => {
            if (!options || typeof options.publisher !== 'number') { // TODO: delete when debugged
                throw new TypeError('options is null wtf?');
            }
            const deviceId = this._deviceIds.get(options.publisher);
            // TODO: notify or save notification about the change
        }, { get_retained: true });
    }
};
AutobahnController[_a] = true;
AutobahnController = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.ServerConfig)),
    tslib_1.__param(1, inversify_1.inject(types_1.TYPES.DroneModel)),
    tslib_1.__metadata("design:paramtypes", [Object, drones_model_1.DroneModel, Object])
], AutobahnController);
exports.AutobahnController = AutobahnController;
//# sourceMappingURL=autobahn.controller.js.map