const scheduleTable = new Map<symbol, NodeJS.Timeout>();

export function scheduleTimer(fn: () => void, timeout: number) {
  const id = Symbol(Date.now());
  setTimeout(() => {
    cancelTimer(id);
    fn();
  }, timeout);
  return id;
}

export function cancelTimer(id: symbol) {
  clearTimeout(scheduleTable.get(id)!);
  scheduleTable.delete(id);
}