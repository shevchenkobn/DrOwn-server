import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DroneOrdersController } from '../rest-controllers/drone-orders.controller';

export = container.get<DroneOrdersController>(TYPES.DroneOrderController);
