"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["GQL_VALUE_BAD"] = "GQL_VALUE_BAD";
    ErrorCode["GQL_DIRECTIVE_TARGED"] = "GQL_DIRECTIVE_TARGED";
    ErrorCode["AUTH_NO"] = "AUTH_NO";
    ErrorCode["AUTH_ROLE"] = "AUTH_ROLE";
    ErrorCode["AUTH_BAD"] = "AUTH_BAD";
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
//# sourceMappingURL=error.service.js.map