import { resolve } from 'app-root-path';
import * as config from 'config';
import * as path from 'path';
import { promises as fsPromises } from 'fs';
import { JwtConfig } from './authentication.service';

const jwtConfig = config.get<JwtConfig>('jwt');

export interface KeyPaths {
  privateKeyPath: string;
  publicKeyPath: string;
}

export interface Keys {
  publicKey: string;
  privateKey: string;
}

export function getKeyPaths(config = jwtConfig.keys): KeyPaths {
  return {
    privateKeyPath: resolve(path.join(config.folder, config.private)),
    publicKeyPath: resolve(path.join(config.folder, config.public)),
  };
}

export function saveKeys(
  { privateKeyPath, publicKeyPath }: KeyPaths,
  { privateKey, publicKey }: Keys,
) {
  return Promise.all([
    fsPromises.writeFile(privateKeyPath, privateKey, 'utf8'),
    fsPromises.writeFile(publicKeyPath, publicKey, 'utf8'),
  ]);
}

export async function loadKeys({ privateKeyPath, publicKeyPath }: KeyPaths): Promise<Keys> {
  return {
    privateKey: await fsPromises.readFile(privateKeyPath, 'utf8'),
    publicKey: await fsPromises.readFile(publicKeyPath, 'utf8'),
  };
}
