import { resolve } from 'app-root-path';
import { resolveRefsAt, resolveRefs } from 'json-refs';
import * as YAML from 'js-yaml';
import { Maybe } from '../@types';
import { Request } from 'express';
import * as randomatic from 'randomatic';
import { ErrorCode, LogicError } from './error.service';
import { TableName } from './table-names';
import { QueryBuilder, RawBuilder } from 'knex';
import Knex = require('knex');
import { IUserBase } from '../models/users.model';

const handlers: ((...args: any[]) => any)[] = [];
const signals = ['SIGTERM', 'SIGINT', 'SIGQUIT'] as NodeJS.Signals[];
export function bindOnExitHandler(handler: (...args: any[]) => any) {
  if (handlers.length === 0) {
    const cb = (...args: any[]) => {
      execHandlers(args);
      process.removeListener('beforeExit', cb);
    };
    process.once('beforeExit', cb);
    for (const signal of signals) {
      const cb = (...args: any[]) => {
        execHandlers(args);
        removeHandlers(cb);
        setTimeout(() => process.exit(0), 1000);
      };
      process.once(signal, cb);
    }
  }
  handlers.push(handler);
}

function execHandlers(args: any[]) {
  for (const handler of handlers) {
    handler(...args);
  }
}

function removeHandlers(handler: (...args: any[]) => any) {
  for (const signal of signals) {
    process.removeListener(signal, handler);
  }
}

export function hasOnExitHandler(handler: (...args: any) => any) {
  return handlers.indexOf(handler) !== -1;
}

export function unbindOnExitHandler(callback: (...args: any) => any) {
  const i = handlers.indexOf(callback);
  if (i === -1) {
    return false;
  }
  handlers.splice(i, 1);
  return true;
}

export function getSafeSwaggerParam<T>(req: Request, name: string): Maybe<T> {
  return req
    && (req as any).swagger
    && (req as any).swagger.params
    && (req as any).swagger.params[name]
    && (req as any).swagger.params[name].value as T
    || undefined;
}

export function loadSwaggerSchema() {
  return resolveRefsAt(resolve('swagger/__init__.yaml'), {
    loaderOptions: {
      processContent(content: { text: string }, callback: (err: any, obj?: any) => void) {
        try {
          callback(null, YAML.load(content.text));
        } catch (err) {
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

export interface IEnum {
  [prop: string]: number | string;
}

export function enumToObject(enumType: IEnum) {
  const values: {[prop: string]: number} = {};
  for (const key of Object.keys(enumType)) {
    if (!Number.isNaN(Number.parseInt(key, 10))) { // Filter for non-numeric values
      continue;
    }
    values[key.toLowerCase()] = enumType[key] as number;
  }
  return values;
}

export function getRandomString(length: number) {
  return randomatic('aA0!', length);
}

export function getSortFields(
  columns: Maybe<string[]>,
  tableName?: TableName,
  excludeColumns?: ReadonlyArray<string>,
) {
  if (!columns || columns.length === 0) {
    return undefined;
  }
  const columnSet = new Set<string>();
  for (const sortColumn of columns) {
    const column = sortColumn.slice(1);
    if (columnSet.has(column) || excludeColumns && excludeColumns.includes(column)) {
      throw new LogicError(ErrorCode.SORT_BAD);
    }
  }
  return (tableName
    ? columns.map(
      column => [`${tableName}.${column} as ${column}`, column[0] === '-' ? 'asc' : 'desc'],
    )
    : columns.map(column => [column, column[0] === '-' ? 'asc' : 'desc'])) as [string, string][];
}

export function getSelectAsColumns(columns: Maybe<string[]>, tableName: TableName) {
  if (!columns || columns.length === 0) {
    return [];
  }
  return columns.map(col => `${tableName}.${col} as ${col}`);
}

export function mapObject(
  entity: {[column: string]: any},
  columns: string[],
  tableName?: TableName,
) {
  const obj = {} as typeof entity;
  if (tableName) {
    for (const col of columns) {
      obj[col] = entity[`${tableName}.${col} as ${col}`];
    }
  } else {
    for (const col of columns) {
      obj[col] = entity[col];
    }
  }
  return obj;
}

export function appendLikeQuery(knex: Knex, query: QueryBuilder, column: string, value: string) {
  const pieces = knex.raw(value).toQuery()
    .replace(/\\\\/g, String.raw `\\\\`)
    .replace(/[%_]/g, ch => '\\${ch}')
    .split(/\s+/);
  for (const piece of pieces) {
    query.andWhere(column, 'like', `%${piece}%`);
  }
  return query;
}

export function appendOrderBy(
  query: QueryBuilder,
  sortings: Maybe<ReadonlyArray<[string, string]>>,
) {
  if (sortings) {
    for (const [column, direction] of sortings) {
      query.orderBy(column, direction);
    }
  }
  return query;
}

export interface ILocation {
  longitude: Maybe<number>;
  latitude: Maybe<number>;
}
export function checkLocation(user: ILocation) {
  if ((typeof user.latitude !== 'number') !== (typeof user.longitude !== 'number')) {
    throw new LogicError(ErrorCode.LOCATION_BAD);
  }
}

export function normalizeOrigins(origins: string[]) {
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
