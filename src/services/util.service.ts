import * as globby from 'globby';
import { resolve } from 'app-root-path';
import { promises as fsPromises } from 'fs';
import * as RefParser from 'json-schema-ref-parser';

const { readFile } = fsPromises;

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
  return RefParser.dereference('swagger/index.yaml', {
    parse: {
      json: false,
      yaml: true,
      text: false,
      binary: false,
    } as any,

    resolve: {
      external: false,
      http: false,
      file: true,
    },

    dereference: {
      circular: false,
    },
  });
  // const fileNames = await globby(resolve('swagger/{,**/}*.yaml'));
  //
  // const fileResult = fileNames.map(n => readFile(n, 'utf8'));
  //
  // const filesContent = [];
  // for (const content of await Promise.all(fileResult)) {
  //   filesContent.push(content);
  // }
  //
  // return filesContent; // filesContent.join('\n');
}
