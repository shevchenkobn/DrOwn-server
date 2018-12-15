"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scheduleTable = new Map();
function scheduleTimer(fn, timeout) {
    const id = Symbol(Date.now());
    setTimeout(() => {
        cancelTimer(id);
        fn();
    }, timeout);
    return id;
}
exports.scheduleTimer = scheduleTimer;
function cancelTimer(id) {
    clearTimeout(scheduleTable.get(id));
    scheduleTable.delete(id);
}
exports.cancelTimer = cancelTimer;
//# sourceMappingURL=scheduler.service.js.map