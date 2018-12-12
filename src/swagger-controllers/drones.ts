import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DronesController } from '../rest-controllers/drones.controller';

export = container.get<DronesController>(TYPES.DronesController);
