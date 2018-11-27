#!/usr/bin/node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const yargs = require("yargs");
const crypto_1 = require("crypto");
const key_service_1 = require("../services/key.service");
const util_1 = require("util");
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
const generateKeyPairAsync = util_1.promisify(crypto_1.generateKeyPair);
(async () => {
    try {
        console.log(`Generating ${argv.size}-bit keys...`);
        const keyPaths = key_service_1.getKeyPaths();
        const keys = await generateKeyPairAsync('rsa', {
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
        await key_service_1.saveKeys(keyPaths, keys);
        console.log('Done. Bye!');
    }
    catch (err) {
        console.error('Error occured: ');
        console.error(err.message);
    }
    finally {
        process.emit('SIGINT', 'SIGINT');
    }
})();
//# sourceMappingURL=generate-key-pair.js.map