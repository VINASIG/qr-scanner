# Third party notices

Reviewed 5 October 2026.

| Material                                       | License                    | Distributed use                         |
| ---------------------------------------------- | -------------------------- | --------------------------------------- |
| zxing-wasm 3.1.4                               | MIT                        | Browser reader glue                     |
| ZXing C++ at the commit exported by zxing-wasm | Apache-2.0                 | Reader WASM                             |
| Lucide via @lucide/astro 1.50.0                | ISC                        | Interface icons                         |
| Space Grotesk                                  | OFL-1.1                    | Local font files                        |
| VINASIG identity exports                       | VINASIG Brand Usage Policy | Unchanged transparent logos and favicon |
| VINASIG shared theme, tokens and controls      | AGPL-3.0-or-later          | Adopted design components               |
| node-qrcode 1.5.4                              | MIT                        | Test fixture generation only            |
| pngjs 7.0.0                                    | MIT                        | Test image composition only             |

The original MIT, Apache and ISC texts are preserved in public/licenses. Font attribution and OFL text are preserved in public/fonts. docs/asset-manifest.json records unchanged brand and font digests.

scripts/notices.ts records the matching decoder package version, upstream ZXing C++ commit, reader WASM SHA-256 and application source revision. The build rejects a mismatched reader WASM.

The decoder's default CDN URL is overridden with a same-origin Vite asset. No writer WASM or test encoder ships in the application.

The dependency lockfile retains package integrity information. Development dependencies are not covered by a blanket change of upstream license.
