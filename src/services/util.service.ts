import { resolve } from 'app-root-path';
import { resolveRefsAt } from 'json-refs';
import * as YAML from 'js-yaml';

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
