"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const config = require("config");
const inversify_1 = require("inversify");
const types_1 = require("../di/types");
const key_service_1 = require("./key.service");
const jwt = require("jsonwebtoken");
const jwtConfig = config.get('jwt');
let JwtAuthetication = class JwtAuthetication {
    constructor(keyPaths = key_service_1.getKeyPaths()) {
        this[types_1.ASYNC_INIT] = key_service_1.loadKeys(keyPaths).then(keys => {
            this._keys = keys;
        });
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
    decode(token) {
        const payload = jwt.verify(token, this._keys.publicKey, {
            algorithms: ['RS256'],
            issuer: jwtConfig.issuer,
            ignoreExpiration: false,
        });
        return payload;
    }
};
JwtAuthetication = tslib_1.__decorate([
    inversify_1.injectable(),
    tslib_1.__metadata("design:paramtypes", [Object])
], JwtAuthetication);
exports.JwtAuthetication = JwtAuthetication;
//# sourceMappingURL=authentication.class.js.map