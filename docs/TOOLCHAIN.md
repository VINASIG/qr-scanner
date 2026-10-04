# Toolchain

Reviewed on 5 October 2026 against the npm registry, package exports, installed declarations and official upstream documentation.

- Node 24.21.0 and npm 12.2.0 are pinned for local work and CI.
- Astro 7.3.5 builds static pages with TypeScript.
- zxing-wasm 3.1.4 provides the worker reader. Only its reader WASM ships.
- @lucide/astro 1.52.0 provides interface icons. Brand assets and Space Grotesk are local files.
- TypeScript 6.0.3 uses the strictest Astro preset with strict declaration checking and no implicit returns.
- typescript-eslint 8.71.0 supports the selected TypeScript and ESLint 10 versions. TypeScript 7 is not selected while outside that supported range.
- @types/node 24.19.1 follows the actual Node 24 runtime instead of unrelated latest runtime declarations.
- ESLint 10.12.0 with strict type-aware rules, Stylelint 17.16.0, Prettier 3.9.9 and html-validate 11.16.2 enforce zero-warning source checks.
- Playwright 1.63.0 runs Chromium, Firefox and WebKit. axe-core Playwright 4.13.0 adds automated accessibility checks.
- Lighthouse 13.5.0 records three cold mobile and three cold desktop runs per language.
- qrcode 1.5.4 and pngjs 7.0.0 only create synthetic test images. The writer side of zxing-wasm is used only in tests for Micro QR and rectangular QR fixtures.

Exact package versions and integrity digests are committed in package-lock.json. Dependency review evidence is retained under output/checks/. Do not blindly run npm audit fix with force or downgrade the toolchain to silence an advisory.

npm 12 omits the lockfile's optional top-level license field. This repository records that field as AGPL-3.0-or-later to satisfy the adopted license consistency guard. Preserve it when regenerating the lockfile.

The esbuild install script is blocked by npm's script approval policy. The supported platform package supplies the executable and the current build works without approving package lifecycle scripts.

After dependency changes, read the official compatibility information, regenerate the lockfile, restore SPDX metadata when necessary, run every gate and review output. No dependency upgrade is implied for sibling projects.
