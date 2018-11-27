"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_root_path_1 = require("app-root-path");
const config = require("config");
const path = require("path");
const fs_1 = require("fs");
const jwtConfig = config.get('jwt');
function getKeyPaths(config = jwtConfig.keys) {
    return {
        privateKeyPath: app_root_path_1.resolve(path.join(config.folder, config.private)),
        publicKeyPath: app_root_path_1.resolve(path.join(config.folder, config.public)),
    };
}
exports.getKeyPaths = getKeyPaths;
function saveKeys({ privateKeyPath, publicKeyPath }, { privateKey, publicKey }) {
    return Promise.all([
        fs_1.promises.writeFile(privateKeyPath, privateKey, 'utf8'),
        fs_1.promises.writeFile(publicKeyPath, publicKey, 'utf8'),
    ]);
}
exports.saveKeys = saveKeys;
async function loadKeys({ privateKeyPath, publicKeyPath }) {
    return {
        privateKey: await fs_1.promises.readFile(privateKeyPath, 'utf8'),
        publicKey: await fs_1.promises.readFile(publicKeyPath, 'utf8'),
    };
}
exports.loadKeys = loadKeys;
//# sourceMappingURL=key.service.js.map