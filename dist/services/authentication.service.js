"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../di/types");
const crypto_1 = require("crypto");
const jwt = require("jsonwebtoken");
const config = require("config");
const error_service_1 = require("../services/error.service");
const error_service_2 = require("../services/error.service");
const container_1 = require("../di/container");
const jwtConfig = config.get('jwt');
function encodeJwt(user) {
    return jwt.sign({
        id: user.userId,
    }, jwtConfig.secret, {
        algorithm: 'RS256',
        expiresIn: jwtConfig.expiration.access,
        issuer: jwtConfig.issuer,
    });
}
exports.encodeJwt = encodeJwt;
const userModel = container_1.container.get(types_1.TYPES.UserModel);
async function getUserFromRequest(request) {
    const { id: userId } = decodeJwt(getTokenFromRequest(request));
    return (await userModel.select([], { userId }))[0];
}
exports.getUserFromRequest = getUserFromRequest;
function decodeJwt(token) {
    return jwt.verify(token, jwtConfig.secret, {
        algorithms: ['RS256'],
        issuer: jwtConfig.issuer,
        ignoreExpiration: false,
    });
}
exports.decodeJwt = decodeJwt;
const bearerRegex = /^Bearer +/;
function getTokenFromRequest(request) {
    if (typeof request.headers.authorization !== 'string'
        || !bearerRegex.test(request.headers.authorization)) {
        throw new error_service_1.LogicError(error_service_2.ErrorCode.AUTH_NO);
    }
    return request.headers.authorization.replace(bearerRegex, '');
}
exports.getTokenFromRequest = getTokenFromRequest;
function getRefreshToken(user) {
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
exports.getRefreshToken = getRefreshToken;
function getRefreshTokenExpiration(date = new Date()) {
    return new Date(date.getTime() + jwtConfig.expiration.refresh);
}
exports.getRefreshTokenExpiration = getRefreshTokenExpiration;
//# sourceMappingURL=authentication.service.js.map