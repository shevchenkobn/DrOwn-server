export function bindCallbackOnExit(callback: (...args: any[]) => any) {
  const events = ['SIGTERM', 'SIGINT', 'SIGQUIT', 'beforeExit'];
  const cb = (...args: any[]) => {
    callback(...args);
    for (const event of events) {
      process.removeListener(event, cb);
    }
  };
  for (const event of events) {
    process.once(event as NodeJS.Signals, cb);
  }
}

