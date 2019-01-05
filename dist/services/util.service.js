"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_root_path_1 = require("app-root-path");
const json_refs_1 = require("json-refs");
const YAML = require("js-yaml");
const randomatic = require("randomatic");
const error_service_1 = require("./error.service");
const handlers = [];
const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
function bindOnExitHandler(handler) {
    if (handlers.length === 0) {
        const cb = (...args) => {
            execHandlers(args);
            process.removeListener('beforeExit', cb);
        };
        process.once('beforeExit', cb);
        for (const signal of signals) {
            const cb = (...args) => {
                execHandlers(args);
                removeHandlers(cb);
                setTimeout(() => process.exit(0), 1000);
            };
            process.once(signal, cb);
        }
    }
    handlers.push(handler);
}
exports.bindOnExitHandler = bindOnExitHandler;
function execHandlers(args) {
    for (const handler of handlers) {
        handler(...args);
    }
}
function removeHandlers(handler) {
    for (const signal of signals) {
        process.removeListener(signal, handler);
    }
}
function hasOnExitHandler(handler) {
    return handlers.indexOf(handler) !== -1;
}
exports.hasOnExitHandler = hasOnExitHandler;
function unbindOnExitHandler(callback) {
    const i = handlers.indexOf(callback);
    if (i === -1) {
        return false;
    }
    handlers.splice(i, 1);
    return true;
}
exports.unbindOnExitHandler = unbindOnExitHandler;
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
    return json_refs_1.resolveRefsAt(app_root_path_1.resolve('swagger/__init__.yaml'), {
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
            continue;
        }
        values[key.toLowerCase()] = enumType[key];
    }
    return values;
}
exports.enumToObject = enumToObject;
function getRandomString(length) {
    return randomatic('aA0!', length);
}
exports.getRandomString = getRandomString;
function getSortFields(columns, tableName, excludeColumns) {
    if (!columns || columns.length === 0) {
        return undefined;
    }
    const columnSet = new Set();
    for (const sortColumn of columns) {
        const column = sortColumn.slice(1);
        if (columnSet.has(column) || excludeColumns && excludeColumns.includes(column)) {
            throw new error_service_1.LogicError(error_service_1.ErrorCode.SORT_BAD);
        }
    }
    return (tableName
        ? columns.map(column => [`${tableName}.${column} as ${column}`, column[0] === '-' ? 'asc' : 'desc'])
        : columns.map(column => [column, column[0] === '-' ? 'asc' : 'desc']));
}
exports.getSortFields = getSortFields;
function getSelectAsColumns(columns, tableName) {
    if (!columns || columns.length === 0) {
        return [];
    }
    return columns.map(col => `${tableName}.${col} as ${col}`);
}
exports.getSelectAsColumns = getSelectAsColumns;
function mapObject(entity, columns, tableName) {
    const obj = {};
    if (tableName) {
        for (const col of columns) {
            obj[col] = entity[`${tableName}.${col} as ${col}`];
        }
    }
    else {
        for (const col of columns) {
            obj[col] = entity[col];
        }
    }
    return obj;
}
exports.mapObject = mapObject;
function appendLikeQuery(knex, query, column, value) {
    const pieces = knex.raw(value).toQuery()
        .replace(/\\\\/g, String.raw `\\\\`)
        .replace(/[%_]/g, ch => '\\${ch}')
        .split(/\s+/);
    for (const piece of pieces) {
        query.andWhere(column, 'like', `%${piece}%`);
    }
    return query;
}
exports.appendLikeQuery = appendLikeQuery;
function appendOrderBy(query, sortings) {
    if (sortings) {
        for (const [column, direction] of sortings) {
            query.orderBy(column, direction);
        }
    }
    return query;
}
exports.appendOrderBy = appendOrderBy;
function checkLocation(user) {
    if ((typeof user.latitude !== 'number') !== (typeof user.longitude !== 'number')) {
        throw new error_service_1.LogicError(error_service_1.ErrorCode.LOCATION_BAD);
    }
}
exports.checkLocation = checkLocation;
function normalizeOrigins(origins) {
    const newOrigins = [];
    for (const origin of origins) {
        if (origin === '*' || origin.startsWith('http://') || origin.startsWith('https://')) {
            newOrigins.push(origin);
            continue;
        }
        newOrigins.push('http://' + origin, 'https://' + origin);
    }
    return newOrigins;
}
exports.normalizeOrigins = normalizeOrigins;
//# sourceMappingURL=util.service.js.map