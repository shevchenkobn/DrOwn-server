import { resolve } from 'app-root-path';
import { resolveRefsAt, resolveRefs } from 'json-refs';
import * as YAML from 'js-yaml';
import { Maybe } from '../@types';
import { Request } from 'express';
import * as randomatic from 'randomatic';
import { ErrorCode, LogicError } from './error.service';
import { TableName } from './table-schemas.service';

export function bindCallbackOnExit(callback: (...args: any[]) => any) {
  const events = ['SIGTERM', 'SIGINT', 'SIGQUIT'] as NodeJS.Signals[];

  const handlers: [NodeJS.Signals, (...args: any[]) => any][] = events.map(signal => [
    signal,
    (...args: any[]) => {
      callback(...args);
      for (const [event, handler] of handlers) {
        process.removeListener(event as NodeJS.Signals, handler);
      }
      process.emit(signal, signal);
    },
  ]) as any;
  handlers.push(['beforeExit' as NodeJS.Signals, (...args: any[]) => {
    callback(...args);
    for (const [event, handler] of handlers) {
      process.removeListener(event as NodeJS.Signals, handler);
    }
  }]);

  for (const [event, handler] of handlers) {
    process.once(event as NodeJS.Signals, handler);
  }
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

export function getSortFields(columns: Maybe<string[]>, tableName?: TableName) {
  if (!columns || columns.length === 0) {
    return undefined;
  }
  const columnSet = new Set<string>();
  for (const sortColumn of columns) {
    const column = sortColumn.slice(1);
    if (columnSet.has(column)) {
      throw new LogicError(ErrorCode.SORT_BAD);
    }
  }
  return tableName
    ? columns.map(
      column => [`${tableName}.${column} as ${column}`, column[0] === '-' ? 'asc' : 'desc'],
    )
    : columns.map(column => [column, column[0] === '-' ? 'asc' : 'desc']);
}

export function getSelectAsColumns(columns: Maybe<string[]>, tableName: TableName) {
  if (!columns || columns.length === 0) {
    return [];
  }
  return columns.map(col => `${tableName}.${col} as ${col}`);
}

