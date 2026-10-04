import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import {
  ZXING_CPP_COMMIT,
  ZXING_WASM_SHA256,
  ZXING_WASM_VERSION,
} from 'zxing-wasm/reader';
import { repositoryRoot, digest } from './local.ts';
import { siteOrigin } from '../site.config.mjs';
const wasm = await readFile(
  path.join(
    repositoryRoot,
    'node_modules/zxing-wasm/dist/reader/zxing_reader.wasm',
  ),
);
if (digest(wasm) !== ZXING_WASM_SHA256)
  throw new Error('Decoder WASM digest mismatch');
const cname = path.join(repositoryRoot, 'public/CNAME');
if (new URL(siteOrigin).hostname !== 'vinasig.github.io')
  await writeFile(cname, new URL(siteOrigin).hostname + '\n');
else await rm(cname, { force: true });
let revision = process.env['PUBLIC_BUILD_REVISION'] ?? 'main';
if (revision === 'main') {
  try {
    revision = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    /* New checkout before the first commit. */
  }
}
await mkdir(path.join(repositoryRoot, 'public/licenses'), { recursive: true });
await writeFile(
  path.join(repositoryRoot, 'public/build-info.json'),
  JSON.stringify(
    {
      revision,
      decoderVersion: ZXING_WASM_VERSION,
      decoderCommit: ZXING_CPP_COMMIT,
      wasmSHA256: ZXING_WASM_SHA256,
    },
    null,
    2,
  ) + '\n',
);
await writeFile(
  path.join(repositoryRoot, 'public/licenses/NOTICE.txt'),
  [
    'VINASIG QR Scanner',
    '',
    'Software: AGPL-3.0-or-later. Documentation: CC-BY-SA-4.0.',
    'Corresponding Source: https://github.com/VINASIG/qr-scanner/tree/' +
      revision,
    'The source repository includes the application, build instructions and locked dependencies.',
    'VINASIG marks are governed separately by BRAND_POLICY.md. Space Grotesk uses OFL-1.1.',
    '',
    'Bundled reader: zxing-wasm ' +
      ZXING_WASM_VERSION +
      ' (MIT), Copyright 2023 Ze-Zheng Wu.',
    'ZXing C++ (Apache-2.0), source commit ' + ZXING_CPP_COMMIT + '.',
    'ZXing C++ source: https://github.com/zxing-cpp/zxing-cpp/tree/' +
      ZXING_CPP_COMMIT,
    'Matching reader WASM SHA-256: ' + ZXING_WASM_SHA256,
    'Full license texts: zxing-wasm.txt and zxing-cpp.txt in this directory.',
    'Lucide icons use ISC. Full text: lucide.txt.',
    'The QR encoder used only for tests is node-qrcode (MIT). It is not shipped in the application.',
    '',
    'This distribution contains no CDN decoder, user uploads, camera frames or saved QR history.',
    '',
  ].join('\n'),
);
