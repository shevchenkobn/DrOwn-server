import { TYPES } from '../di/types';
import { SwaggerSecurityHandler } from 'swagger-tools';
import { IUser, UserRoles } from '../models/users.model';
import { ErrorCode, LogicError } from './error.service';
import { container } from '../di/container';
import { AuthService } from './authentication.class';

const jwt = container.get<AuthService>(TYPES.AuthService);

export const authenticateBearer: SwaggerSecurityHandler = async (
  req,
  securityDefinition,
  authorizationHeader,
  next,
) => {
  let user: IUser;
  try {
    user = await jwt.getUserFromString(authorizationHeader as string);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      next(new LogicError(ErrorCode.AUTH_EXPIRED));
      return;
    }
    next(new LogicError(ErrorCode.AUTH_NO));
    return;
  }

  const roleNames = (req as any).swagger.operation['x-security-scopes'];
  if (roleNames && roleNames.length >= 0) {
    const roles: number[] = roleNames.map((name: string) => UserRoles[name.toUpperCase() as any]);
    let hasRole = false;
    for (const role of roles) {
      if ((user.role & role) !== 0) {
        hasRole = true;
        break;
      }
    }
    if (!hasRole) {
      next(new LogicError(ErrorCode.AUTH_ROLE));
      return;
    }
  }
  (req as any).user = user;
  next();
};
