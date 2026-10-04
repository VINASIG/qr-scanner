# Verification

Evidence belongs in ignored output/, never inside the published application.

The first rendered draft is recorded under output/responsive/before/. This is a new project, so there was no pre-existing product baseline. Screenshots exposed an initial hidden-state cascade bug where the inactive download button and empty-result block could remain visible. The authored hidden rule now comes after component display rules and a regression assertion checks the initial button is hidden.

## Gates

- The license-check lifecycle creates the revision notice before validation, including on a fresh clone where generated public files do not exist. The build performs the same idempotent generation.
- npm run check runs strict typecheck, JavaScript/TypeScript lint, CSS lint, formatting, managed standards integrity and SPDX/license checks.
- npm test checks payload parsing, safe links, escaping and image bounds.
- npm run build validates generated HTML, route metadata, preserved brand/font bytes, source/license access and the exact reader WASM digest.
- npm run test:browser runs three browser engines with synthetic QR files, paste/drop events, explicit URL requests, permission failures, stale work, camera fixture cleanup, result export and accessibility.
- npm run test:performance records three cold mobile and three cold desktop Lighthouse runs for each language with retained JSON and HTML reports.

Additional rendered checks found that long result regions needed a keyboard focus target and that transparent black QR images lost contrast during pixel conversion. Result regions now expose a named, focusable scroll region. Raster decoding and the preview use white for transparent backgrounds. Regression tests preserve raw bytes, clipboard fallback content and decoded metadata across JPEG, WebP, rotated, inverted and transparent QR images. Before and after evidence is retained separately.

The responsive matrix uses 320, 360, 390, 479, 480, 481, 600, 768, 799, 800, 801, 900, 1024, 1280 and 1440 pixels. It includes every standard viewport, both sides of both CSS breakpoints, both themes and both locales. Initial and expanded/error states are scrolled and captured.

Long result output, open disclosures, 200% text, forced colors, reduced motion and script-disabled states are also exercised. Screenshots must be opened and reviewed before reporting a visual pass.

## Honest boundaries

Synthetic camera success and facing-mode/cleanup are exercised where the bundled browser supports canvas camera streams. WebKit's canvas-camera success path is NOT_RUN; its permission/capability states are tested. Native browser clipboard plus Ctrl + V is exercised in Chromium. All engines exercise synthetic paste and drop events. This does not prove every OS clipboard or physical camera works.

Physical phones, real front/back camera devices, VoiceOver/NVDA screen reader runs, independent SI-agent trials, real-user field Core Web Vitals and production image-server variations remain NOT_RUN unless a later report records direct evidence.

See the final output/checks report and GitHub Actions run for actual results. Do not infer responsive correctness from a successful build or claim a visual comparison against an old application that never existed.
