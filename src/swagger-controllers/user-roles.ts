import { TYPES } from '../di/types';
import { container } from '../di/container';
import { UserRolesController } from '../controllers/user-roles.controller';

export = container.get<UserRolesController>(TYPES.UserRolesController);
// const controller = container.get<UserRolesController>(TYPES.UserRolesController);
//
// export const getUserRoles = (...args: any[]) => controller.getUserRoles(args[0], args[1]);
