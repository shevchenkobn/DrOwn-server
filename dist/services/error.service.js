"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTH_NO"] = "AUTH_NO";
    ErrorCode["AUTH_ROLE"] = "AUTH_ROLE";
    ErrorCode["AUTH_BAD"] = "AUTH_BAD";
    ErrorCode["AUTH_EXPIRED"] = "AUTH_EXPIRED";
    ErrorCode["USER_ROLE_BAD"] = "USER_ROLE_BAD";
    ErrorCode["USER_DUPLICATE_EMAIL"] = "USER_DUPLICATE_EMAIL";
    ErrorCode["USER_EMAIL_AND_ID"] = "USER_EMAIL_AND_ID";
    ErrorCode["USER_NO_SAVE_PASSWORD"] = "USER_NO_SAVE_PASSWORD";
    ErrorCode["SELECT_BAD"] = "SELECT_BAD";
    ErrorCode["SWAGGER"] = "SWAGGER";
    ErrorCode["SERVER"] = "SERVER";
    ErrorCode["NOT_FOUND"] = "NOT_FOUND";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
class LogicError extends TypeError {
    constructor(code, message) {
        if (!message) {
            super(code);
        }
        else {
            super(message);
        }
        this.code = code;
    }
}
exports.LogicError = LogicError;
exports.errorHandler = (err, req, res, next) => {
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
    }
    else {
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
        }
        else {
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
function getCodeFromSwaggerError(err, req) {
    if (err.status || err.statusCode) {
        return err.status || err.statusCode;
    }
    if (err.failedValidation) {
        return 400;
    }
    if (swaggerErrorRegex.test(err.message)
        && Array.isArray(err.allowedMethods)
        && err.allowedMethods.every(item => item !== req.method)) {
        return 404;
    }
    return 0;
}
exports.notFoundHandler = (req, res) => {
    res.status(404).json(new LogicError(ErrorCode.NOT_FOUND, `Route ${req.url} is not found`));
};
//# sourceMappingURL=error.service.js.map