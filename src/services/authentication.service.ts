import { TYPES } from '../di/types';
import { auth_cra, Session } from 'autobahn';
import { container } from '../di/container';
import { DroneModel, DroneStatus } from '../models/drones.model';
import { ErrorCode, LogicError } from './error.service';
import * as config from 'config';
import { AutobahnConfig } from '../controllers/autobahn.controller';

const autobahnConfig = config.get<AutobahnConfig>('autobahn');
const droneModel = container.get<DroneModel>(TYPES.DroneModel);

let selfConnected = false;

export const autobahnAuth = {
  async authenticate(
    [realm, authId, details]: [string, string, any],
  ): Promise<{ secret: string, role: string }> {
    if (authId === autobahnConfig.authRPC.authId) {
      if (selfConnected) {
        throw new LogicError(ErrorCode.AUTH_BAD);
      }
      return { secret: autobahnConfig.authRPC.authId, role: autobahnConfig.authRPC.authId };
    }
    const drones = await droneModel.select(['status', 'passwordHash'], { deviceId: authId });
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
  },

  onChallenge(session: Session, method: string, extra: any) {
    if (method !== 'wampcra') {
      throw new TypeError('undefined wamp auth method');
    }

    selfConnected = true;
    return auth_cra.sign(autobahnConfig.authRPC.authId, extra.challenge);
  },
};
