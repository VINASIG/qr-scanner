import { siteURL, siteOrigin } from '../site.config.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { HtmlValidate } from 'html-validate';
import { ZXING_WASM_SHA256 } from 'zxing-wasm/reader';
import { digest, record, repositoryRoot, writeOutput } from './local.ts';
const validator = new HtmlValidate({
  extends: ['html-validate:recommended'],
  rules: { 'void-style': ['error', { style: 'omit' }] },
});
const routes = [
  'index.html',
  'en/index.html',
  'licenses/index.html',
  'en/licenses/index.html',
];
for (const route of routes) {
  const html = await readFile(path.join(repositoryRoot, 'dist', route), 'utf8');
  const validation = await validator.validateString(html, route);
  assert(
    validation.valid,
    JSON.stringify(validation.results.flatMap((item) => item.messages)),
  );
  assert(html.includes('https://vinasig.io.vn/'));
  assert(html.includes('SpaceGrotesk-VariableFont_wght.woff2'));
  if (!route.includes('licenses/')) {
    assert(html.includes('data-scanner'));
    assert(html.includes('application/ld+json'));
    assert(html.includes(siteURL));
    assert(html.includes('hreflang="vi"') && html.includes('hreflang="en"'));
    assert(
      !html.includes('https://scan.vinasig.io.vn/') ||
        siteOrigin.includes('scan.vinasig.io.vn'),
    );
  }
}
const manifest = record(
  JSON.parse(
    await readFile(
      path.join(repositoryRoot, 'docs/asset-manifest.json'),
      'utf8',
    ),
  ) as unknown,
);
const assets = record(manifest['files']);
for (const [relative, expected] of Object.entries(assets)) {
  const original = await readFile(path.join(repositoryRoot, relative));
  assert.equal(digest(original), expected);
  assert.deepEqual(
    await readFile(
      path.join(repositoryRoot, 'dist', relative.replace(/^public\//u, '')),
    ),
    original,
  );
}
const builtAssets = await readdir(path.join(repositoryRoot, 'dist/_astro'));
const wasm = builtAssets.filter((name) => name.endsWith('.wasm'));
assert.equal(wasm.length, 1, 'Ship only the reader WASM');
assert.equal(
  digest(
    await readFile(
      path.join(repositoryRoot, 'dist/_astro', wasm[0] ?? 'missing'),
    ),
  ),
  ZXING_WASM_SHA256,
);
for (const name of builtAssets.filter((value) => value.endsWith('.js'))) {
  const source = await readFile(
    path.join(repositoryRoot, 'dist/_astro', name),
    'utf8',
  );
  assert(!source.includes('cdn.jsdelivr.net'), 'No decoder CDN requests');
}
for (const required of [
  'robots.txt',
  'sitemap.xml',
  'social.png',
  'build-info.json',
  'licenses/zxing-wasm.txt',
  'licenses/zxing-cpp.txt',
])
  assert(
    (await readFile(path.join(repositoryRoot, 'dist', required))).length > 0,
  );
await writeOutput(
  repositoryRoot,
  'output/checks/build.json',
  JSON.stringify(
    {
      status: 'PASS',
      routes,
      preservedAssets: Object.keys(assets).length,
      readerWASM: wasm[0],
      wasmSHA256: ZXING_WASM_SHA256,
    },
    null,
    2,
  ) + '\n',
);
console.log(
  'Built routes, HTML, metadata, preserved assets and reader WASM verified.',
);
