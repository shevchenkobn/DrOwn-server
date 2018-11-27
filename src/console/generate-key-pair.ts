#!/usr/bin/node

import * as yargs from 'yargs';
import { generateKeyPair } from 'crypto';
import { getKeyPaths, saveKeys } from '../services/key.service';
import { promisify } from 'util';

const argv = yargs
  .usage('Run it to generate key pair, used by JWT.')
  .version().alias('v', 'version')
  .option('size', {
    alias: 's',
    type: 'number',
    default: 2048,
    description: 'Size of RSA keys (in bits)',
  })
  .help('help').alias('h', 'help')
  .argv;

const generateKeyPairAsync = promisify(generateKeyPair);
(async () => {
  try {
    console.log(`Generating ${argv.size}-bit keys...`);
    const keyPaths = getKeyPaths();
    const keys = await (generateKeyPairAsync as any)('rsa', {
      modulusLength: argv.size,
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
      publicKeyEncoding: {
        type: 'pkcs1',
        format: 'pem',
      },
    });
    console.log('Writing files...');
    await saveKeys(keyPaths, keys);
    console.log('Done. Bye!');
  } catch (err) {
    console.error('Error occured: ');
    console.error(err.message);
  } finally {
    process.emit('SIGINT', 'SIGINT');
  }
})();
