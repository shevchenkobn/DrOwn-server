import { ErrorRequestHandler, Handler, Request } from 'express';

export enum ErrorCode {
  AUTH_NO = 'AUTH_NO',
  AUTH_ROLE = 'AUTH_ROLE',
  AUTH_BAD = 'AUTH_BAD',
  AUTH_EXPIRED = 'AUTH_EXPIRED',

  USER_NO_COMPANY = 'USER_NO_COMPANY',
  USER_NO_REGISTER_DATA = 'USER_NO_REGISTER_DATA',
  USER_ROLE_BAD = 'USER_ROLE_BAD',
  USER_DUPLICATE_EMAIL = 'USER_DUPLICATE_EMAIL',

  SWAGGER = 'SWAGGER',

  SERVER = 'SERVER',
  HTTP_404 = '404',
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
  if (err instanceof LogicError) {
    switch (err.code) {
      case ErrorCode.AUTH_ROLE:
      case ErrorCode.AUTH_EXPIRED:
        res.status(403);
        break;

      case ErrorCode.AUTH_NO:
      case ErrorCode.AUTH_BAD:
        res.status(401);
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
      err.code = ErrorCode.SWAGGER;
      res.status(httpCodeFromSwaggerError);
    } else {
      res.status(500);
    }
  }
  // todo: log error
  console.error(err);
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
  res.status(404).json(new LogicError(ErrorCode.HTTP_404, `Route ${req.url} is not found`));
};
