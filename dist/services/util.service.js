"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_root_path_1 = require("app-root-path");
const json_refs_1 = require("json-refs");
const YAML = require("js-yaml");
function bindCallbackOnExit(callback) {
    const events = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
    const handlers = events.map(signal => [
        signal,
        (...args) => {
            callback(...args);
            for (const [event, handler] of handlers) {
                process.removeListener(event, handler);
            }
            process.emit(signal, signal);
        },
    ]);
    handlers.push(['beforeExit', (...args) => {
            callback(...args);
            for (const [event, handler] of handlers) {
                process.removeListener(event, handler);
            }
        }]);
    for (const [event, handler] of handlers) {
        process.once(event, handler);
    }
}
exports.bindCallbackOnExit = bindCallbackOnExit;
function getSafeSwaggerParam(req, name) {
    return req
        && req.swagger
        && req.swagger.params
        && req.swagger.params[name]
        && req.swagger.params[name].value
        || undefined;
}
exports.getSafeSwaggerParam = getSafeSwaggerParam;
function loadSwaggerSchema() {
    return json_refs_1.resolveRefsAt(app_root_path_1.resolve('swagger/index.yaml'), {
        loaderOptions: {
            processContent(content, callback) {
                try {
                    callback(null, YAML.load(content.text));
                }
                catch (err) {
                    // TODO: log error
                    console.log(err);
                    callback(err);
                }
            },
        },
        resolveCirculars: false,
        includeInvalid: false,
    });
}
exports.loadSwaggerSchema = loadSwaggerSchema;
function enumToObject(enumType) {
    const values = {};
    for (const key of Object.keys(enumType)) {
        if (!Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
            return values;
        }
        values[key.toLowerCase()] = enumType[key];
    }
    return values;
}
exports.enumToObject = enumToObject;
//# sourceMappingURL=util.service.js.map