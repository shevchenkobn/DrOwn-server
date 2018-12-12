import { TYPES } from '../di/types';
import { container } from '../di/container';
import { AuthController } from '../rest-controllers/auth.controller';

export = container.get<AuthController>(TYPES.AuthController);
