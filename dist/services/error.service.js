"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["AUTH_NO"] = "AUTH_NO";
    ErrorCode["AUTH_ROLE"] = "AUTH_ROLE";
    ErrorCode["AUTH_BAD"] = "AUTH_BAD";
    ErrorCode["AUTH_EXPIRED"] = "AUTH_EXPIRED";
    ErrorCode["USER_ROLE_BAD"] = "USER_ROLE_BAD";
    ErrorCode["USER_EMAIL_DUPLICATE"] = "USER_EMAIL_DUPLICATE";
    ErrorCode["USER_ID_EMAIL"] = "USER_EMAIL_AND_ID";
    ErrorCode["USER_PASSWORD_SAVE_NO"] = "USER_PASSWORD_SAVE_NO";
    ErrorCode["USER_BLOCKED"] = "USER_BLOCKED";
    ErrorCode["DRONE_OWNER_NO"] = "DRONE_OWNER_NO";
    ErrorCode["DRONE_PRODUCER_NO"] = "DRONE_PRODUCER_NO";
    ErrorCode["DRONE_DEVICE_ID_BAD"] = "DRONE_DEVICE_ID_BAD";
    ErrorCode["DRONE_OWNER_BAD"] = "DRONE_OWNER_BAD";
    ErrorCode["DRONE_PRODUCER_BAD"] = "DRONE_PRODUCER_BAD";
    ErrorCode["DRONE_ID_DRONE_DEVICE"] = "DRONE_ID_DRONE_DEVICE";
    ErrorCode["DRONE_UNAUTHORIZED"] = "DRONE_UNAUTHORIZED";
    ErrorCode["DRONE_AUTHORIZED"] = "DRONE_AUTHORIZED";
    ErrorCode["DRONE_RENTED"] = "DRONE_RENTED";
    ErrorCode["DRONE_STATUS_BAD"] = "DRONE_STATUS_BAD";
    ErrorCode["SELECT_BAD"] = "SELECT_BAD";
    ErrorCode["LOCATION_BAD"] = "LOCATION_BAD";
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
            case ErrorCode.NOT_FOUND:
                res.status(404);
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