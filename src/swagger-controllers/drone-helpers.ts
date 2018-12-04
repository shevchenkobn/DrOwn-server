import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DroneHelpersController } from '../controllers/drone-helpers.controller';

export = container.get<DroneHelpersController>(TYPES.DroneHelpersController);
