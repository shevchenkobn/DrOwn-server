import { TYPES } from '../di/types';
import { container } from '../di/container';
import { UsersController } from '../rest-controllers/users.controller';

export = container.get<UsersController>(TYPES.UsersController);
