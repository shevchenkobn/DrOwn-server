"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function bindCallbackOnExit(callback) {
    const events = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
    const handlers = events.map(signal => [
        signal,
        (...args) => {
            callback(...args);
            for (const [event, handler] of handlers) {
                process.removeListener(event, handler);
            }
            process.emit(signal, signal);
        },
    ]);
    handlers.push(['beforeExit', (...args) => {
            callback(...args);
            for (const [event, handler] of handlers) {
                process.removeListener(event, handler);
            }
        }]);
    for (const [event, handler] of handlers) {
        process.once(event, handler);
    }
}
exports.bindCallbackOnExit = bindCallbackOnExit;
function getSelectColumns(info) {
    return info.fieldNodes[0].selectionSet.selections.map(s => s.name.value);
}
exports.getSelectColumns = getSelectColumns;
//# sourceMappingURL=util.service.js.map