import { resolve } from 'app-root-path';
import { resolveRefsAt, resolveRefs } from 'json-refs';
import * as YAML from 'js-yaml';
import { Maybe } from '../@types';
import { Request } from 'express';

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
  return resolveRefsAt(resolve('swagger/index.yaml'), {
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

// export async function loadSwaggerSchema() {
//   const schema = await resolveRefs(
//     (await resolveRefsAt(resolve('swagger/index.yaml'), {
//       loaderOptions: {
//         processContent(content: { text: string }, callback: (err: any, obj?: any) => void) {
//           try {
//             callback(null, YAML.load(content.text));
//           } catch (err) {
//             // TODO: log error
//             console.log(err);
//             callback(err);
//           }
//         },
//       },
//       resolveCirculars: false,
//       includeInvalid: false,
//     })).resolved,
//     {
//       resolveCirculars: false,
//       includeInvalid: false,
//     },
//   );
//   schema.resolved = mergeSchemaAllOf(schema.resolved);
//   return schema;
// }
