import { GraphQLResolveInfo } from 'graphql';
import { FieldNode } from 'graphql';

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

export function getSelectColumns(info: GraphQLResolveInfo) {
  return (info.fieldNodes[0].selectionSet!.selections as FieldNode[]).map(s => s.name.value);
}