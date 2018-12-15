const scheduleTable = new Map<number, NodeJS.Timeout>();

export function scheduleTimer(fn: () => void, timeout: number) {
  const id = Date.now();
  setTimeout(() => {
    cancelTimer(id);
    fn();
  }, timeout);
  return id;
}

export function cancelTimer(id: number) {
  clearTimeout(scheduleTable.get(id)!);
  scheduleTable.delete(id);
}