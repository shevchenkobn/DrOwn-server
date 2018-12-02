import { ErrorRequestHandler, Handler, Request } from 'express';

export enum ErrorCode {
  AUTH_NO = 'AUTH_NO',
  AUTH_ROLE = 'AUTH_ROLE',
  AUTH_BAD = 'AUTH_BAD',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  USER_COMPANY_BAD = 'USER_COMPANY_BAD',
  USER_COMPANY_NO = 'USER_COMPANY_NO',
  USER_ROLE_BAD = 'USER_ROLE_BAD',
  USER_DUPLICATE_EMAIL = 'USER_DUPLICATE_EMAIL',
  USER_NO_SAVE_PASSWORD = 'USER_NO_SAVE_PASSWORD',

  SELECT_BAD = 'SELECT_BAD',

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
