import { ErrorRequestHandler, Handler, Request } from 'express';

export enum ErrorCode {
  AUTH_NO = 'AUTH_NO',
  AUTH_ROLE = 'AUTH_ROLE',
  AUTH_BAD = 'AUTH_BAD',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  USER_ROLE_BAD = 'USER_ROLE_BAD',
  USER_FILTER_BAD = 'USER_FILTER_BAD',
  USER_EMAIL_DUPLICATE = 'USER_EMAIL_DUPLICATE',
  USER_ID_EMAIL = 'USER_EMAIL_AND_ID',
  USER_PASSWORD_NO = 'USER_PASSWORD_NO',
  USER_PASSWORD_SAVE_NO = 'USER_PASSWORD_SAVE_NO',
  USER_HAS_DRONES = 'USER_HAS_DRONES',

  DRONE_OWNER_NO = 'DRONE_OWNER_NO',
  DRONE_PRODUCER_NO = 'DRONE_PRODUCER_NO',
  DRONE_DEVICE_ID_BAD = 'DRONE_DEVICE_ID_BAD',
  DRONE_DEVICE_ID_PASSWORD = 'DRONE_DEVICE_ID_PASSWORD',
  DRONE_OWNER_BAD = 'DRONE_OWNER_BAD',
  DRONE_PRODUCER_BAD = 'DRONE_PRODUCER_BAD',
  DRONE_ID_DRONE_DEVICE = 'DRONE_ID_DRONE_DEVICE',
  DRONE_UNAUTHORIZED = 'DRONE_UNAUTHORIZED',
  DRONE_AUTHORIZED = 'DRONE_AUTHORIZED',
  DRONE_RENTED = 'DRONE_RENTED',

  DRONE_STATUS_BAD = 'DRONE_STATUS_BAD',

  DRONE_PRICE_DRONE_BAD = 'DRONE_PRICE_DRONE_BAD',

  TRANSACTION_DRONE_ID = 'TRANSACTION_DRONE_ID',
  TRANSACTION_PERIOD = 'TRANSACTION_PERIOD',
  TRANSACTION_CASH = 'TRANSACTION_CASH',
  TRANSACTION_USER_SAME = 'TRANSACTION_USER_SAME',
  TRANSACTION_STATUS_BAD = 'TRANSACTION_STATUS_BAD',

  DRONE_ORDER_ACTION_BAD = 'DRONE_ORDER_ACTION_BAD',

  SELECT_BAD = 'SELECT_BAD',
  SORT_BAD = 'SORT_BAD',
  LOCATION_BAD = 'LOCATION_BAD',

  SWAGGER = 'SWAGGER',

  SERVER = 'SERVER',
  NOT_FOUND = 'NOT_FOUND',
}

export class LogicError extends TypeError {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message?: string) {
    if (!message) {
      super(code);
    } else {
      super(message);
    }
    this.code = code;
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // TODO: log error
  console.error(err);
  if (err instanceof LogicError) {
    switch (err.code) {
      case ErrorCode.AUTH_ROLE:
      case ErrorCode.AUTH_EXPIRED:
      case ErrorCode.SELECT_BAD:
        res.status(403);
        break;

      case ErrorCode.AUTH_NO:
      case ErrorCode.AUTH_BAD:
        res.status(401);
        break;

      case ErrorCode.SERVER:
        res.status(500);
        break;

      case ErrorCode.NOT_FOUND:
        res.status(404);
        break;

      default:
        res.status(400);
        break;
    }
  } else {
    const httpCodeFromSwaggerError = getCodeFromSwaggerError(err, req);
    if (httpCodeFromSwaggerError !== 0) {
      Object.defineProperties(err, {
        status: {
          enumerable: false,
        },
        message: {
          enumerable: true,
        },
      });
      if (!err.code) {
        err.code = ErrorCode.SWAGGER;
      }
      res.status(httpCodeFromSwaggerError);
    } else {
      res.status(500);
      if (process.env.NODE_ENV === 'production') {
        res.json(new LogicError(ErrorCode.SERVER));
        return;
      }
    }
  }
  res.json(err);
};

// 0 is returned if not a swagger error
const swaggerErrorRegex = /swagger/i;
function getCodeFromSwaggerError(err: any, req: Request): number {
  if (err.status || err.statusCode) {
    return err.status || err.statusCode;
  }
  if (err.failedValidation) {
    return 400;
  }
  if (
    swaggerErrorRegex.test(err.message)
    && Array.isArray(err.allowedMethods)
    && (err.allowedMethods as any[]).every(item => item !== req.method)
  ) {
    return 404;
  }
  return 0;
}

export const notFoundHandler: Handler = (req, res) => {
  res.status(404).json(new LogicError(ErrorCode.NOT_FOUND, `Route ${req.url} is not found`));
};
