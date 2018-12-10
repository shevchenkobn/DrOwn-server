import { TYPES } from '../di/types';
import { container } from '../di/container';
import { UsersController } from '../model-controllers/users.controller';

export = container.get<UsersController>(TYPES.UsersController);
