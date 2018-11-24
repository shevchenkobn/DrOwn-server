import * as globby from 'globby';
import { resolve } from 'app-root-path';
import { promises as fsPromises } from 'fs';

const { readFile } = fsPromises;

export async function loadTypeSystem() {
  const fileNames = await globby(resolve('graphql/{,**/}*.graphql'));

  const fileResult = fileNames.map(n => readFile(n));

  const filesContent = [];
  for (const content of await fileResult) {
    filesContent.push(content);
  }

  return filesContent.join('\n');
}
