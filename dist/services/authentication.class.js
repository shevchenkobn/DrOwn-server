"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
var _a;
"use strict";
const config = require("config");
const inversify_1 = require("inversify");
const types_1 = require("../di/types");
const key_service_1 = require("./key.service");
const users_model_1 = require("../models/users.model");
const jwt = require("jsonwebtoken");
const crypto_1 = require("crypto");
const error_service_1 = require("./error.service");
const jwtConfig = config.get('jwt');
const bearerRegex = /^Bearer +/;
let AuthService = class AuthService {
    constructor(userModel, keyPaths = key_service_1.getKeyPaths()) {
        this[types_1.ASYNC_INIT] = key_service_1.loadKeys(keyPaths).then(keys => {
            this._keys = keys;
        });
        this._userModel = userModel;
    }
    encode(user) {
        return jwt.sign({
            id: user.userId,
        }, this._keys.privateKey, {
            algorithm: 'RS256',
            expiresIn: jwtConfig.expiration.access,
            issuer: jwtConfig.issuer,
        });
    }
    decode(token, ignoreExpiration = false) {
        const payload = jwt.verify(token, this._keys.publicKey, {
            ignoreExpiration,
            algorithms: ['RS256'],
            issuer: jwtConfig.issuer,
        });
        return payload;
    }
    getUserFromRequest(request, ignoreExpiration = false) {
        return this.getUserFromToken(this.getTokenFromRequest(request), ignoreExpiration);
    }
    getUserFromString(str, ignoreExpiration = false) {
        return this.getUserFromToken(this.getTokenFromString(str), ignoreExpiration);
    }
    async getUserFromToken(token, ignoreExpiration = false) {
        const { id: userId } = this.decode(token, ignoreExpiration);
        const users = await this._userModel.select([], { userId });
        if (users.length === 0) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_BAD);
        }
        return users[0];
    }
    getTokenFromRequest(request) {
        if (typeof request.headers.authorization !== 'string') {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_NO);
        }
        return this.getTokenFromString(request.headers.authorization);
    }
    getTokenFromString(str) {
        if (!bearerRegex.test(str)) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.AUTH_NO);
        }
        return str.replace(bearerRegex, '');
    }
    getRefreshToken(user) {
        return new Promise((resolve, reject) => {
            const hasher = crypto_1.createHash('SHA512');
            hasher.once('error', reject);
            hasher.once('readable', () => {
                const data = hasher.read();
                if (!data || data.length === 0) {
                    reject(new TypeError('Hash is empty'));
                    return;
                }
                resolve(data.toString('base64'));
            });
            hasher.write(user.userId + Date.now().toString());
            hasher.end();
        });
    }
    getRefreshTokenExpiration(date = new Date()) {
        return new Date(date.getTime() + jwtConfig.expiration.refresh);
    }
};
_a = types_1.ASYNC_INIT;
AuthService[_a] = true;
AuthService = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__param(0, inversify_1.inject(types_1.TYPES.UserModel)),
    tslib_1.__metadata("design:paramtypes", [users_model_1.UserModel, Object])
], AuthService);
exports.AuthService = AuthService;
//# sourceMappingURL=authentication.class.js.map