import { TYPES } from '../di/types';
import { container } from '../di/container';
import { DronePricesController } from '../rest-controllers/drone-prices.controller';

export = container.get<DronePricesController>(TYPES.DronePriceController);
