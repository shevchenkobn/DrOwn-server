import { SwaggerSecurityHandler } from 'swagger-tools';
import { IUser, UserRoles } from '../models/users.model';
import { getUserFromString } from './authentication.service';
import { ErrorCode, LogicError } from './error.service';

export const authenticateBearer: SwaggerSecurityHandler = async (
  req,
  securityDefinition,
  authorizationHeader,
  next,
) => {
  let user: IUser;
  try {
    user = await getUserFromString(authorizationHeader as string);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      next(new LogicError(ErrorCode.AUTH_EXPIRED));
      return;
    }
    next(new LogicError(ErrorCode.AUTH_NO));
    return;
  }

  const roleNames = (req as any).swagger['x-security-scopes'];
  if (roleNames.length >= 0) {
    const roles: number[] = roleNames.map((name: string) => UserRoles[name.toUpperCase() as any]);
    for (const role of roles) {
      if ((user.role & role) !== 0) {
        next();
        return;
      }
    }
    next(new LogicError(ErrorCode.AUTH_ROLE));
  }
  next();
};
