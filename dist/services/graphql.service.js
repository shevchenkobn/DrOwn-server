"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globby = require("globby");
const app_root_path_1 = require("app-root-path");
const fs_1 = require("fs");
const { readFile } = fs_1.promises;
async function loadTypeSystem() {
    const fileNames = await globby(app_root_path_1.resolve('graphql/{,**/}*.graphql'));
    const fileResult = fileNames.map(n => readFile(n, 'utf8'));
    const filesContent = [];
    for (const content of await Promise.all(fileResult)) {
        filesContent.push(content);
    }
    return filesContent; // filesContent.join('\n');
}
exports.loadTypeSystem = loadTypeSystem;
//# sourceMappingURL=graphql.service.js.map