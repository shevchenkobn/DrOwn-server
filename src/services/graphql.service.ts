import * as globby from 'globby';
import { resolve } from 'app-root-path';
import { promises as fsPromises } from 'fs';

const { readFile } = fsPromises;

export async function loadTypeSystem() {
  const fileNames = await globby(resolve('graphql/{,**/}*.graphql'));

  const fileResult = fileNames.map(n => readFile(n, 'utf8'));

  const filesContent = [];
  for (const content of await Promise.all(fileResult)) {
    filesContent.push(content);
  }

  return filesContent; // filesContent.join('\n');
}
