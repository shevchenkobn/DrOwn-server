import { TYPES } from '../di/types';
import { container } from '../di/container';
import { UserHelpersController } from '../model-controllers/user-helpers.controller';

export = container.get<UserHelpersController>(TYPES.UserHelpersController);
