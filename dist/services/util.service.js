"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function bindCallbackOnExit(callback) {
    const events = ['SIGTERM', 'SIGINT', 'SIGQUIT', 'beforeExit'];
    const cb = (...args) => {
        callback(...args);
        for (const event of events) {
            process.removeListener(event, cb);
        }
    };
    for (const event of events) {
        process.once(event, cb);
    }
}
exports.bindCallbackOnExit = bindCallbackOnExit;
//# sourceMappingURL=util.service.js.map