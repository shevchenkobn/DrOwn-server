import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DroneMeasurementsController } from '../rest-controllers/drone-measurements.controller';

export = container.get<DroneMeasurementsController>(TYPES.DronesMeasurementsController);
