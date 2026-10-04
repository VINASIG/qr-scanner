# VINASIG QR Scanner

Read QR codes from images and cameras without an account or a decoding service.

- Paste a copied image with Ctrl + V on desktop or Cmd + V on macOS.
- Choose an image or drag it into the scanner.
- Fetch an image link with an explicit scan action. Servers must permit browser access.
- Scan with a front or back camera preference. The camera stops after a successful result.
- Read multiple QR codes in one image, copy the original contents or download text and a complete JSON report.
- Inspect version, module grid, error correction, mask, orientation, original bytes, ECI, position and other metadata when reported.
- View readable fields for links, text, Wi-Fi, email, phone, SMS, contacts, locations, calendars and authentication keys.
- Use Vietnamese or English with matching light and dark themes.

Image decoding runs locally in a worker using the pinned ZXing reader and a matching, self-hosted WebAssembly file. There is no decoding API, analytics, account, upload endpoint or QR history. Theme preference is the only saved browser setting.

Image links are fetched directly from the entered server when requested. That server may log the download. A blocked image link is not routed through a proxy. Download it first and paste it or choose the file.

QR contents are shown as text. Decoded links never open automatically. Only explicit HTTP or HTTPS actions are offered. Wi-Fi credentials and authentication keys start collapsed. Downloaded reports include the complete payload and should be kept private when it contains credentials.

## Website

The initial public deployment uses [GitHub Pages](https://vinasig.github.io/qr-scanner/). The intended custom domain is `scan.vinasig.io.vn`. It requires a DNS CNAME and Pages domain configuration before activation. See [deployment instructions](docs/DEPLOYMENT.md).

The VINASIG logo always links to [the organization website](https://vinasig.io.vn/). [QR Generator](https://qr.vinasig.io.vn/) is the companion tool for creating codes.

## Development

Use Node 24.21.0 and npm 12.2.0. Dependencies are exact versions with a committed lockfile.

```sh
npx --yes npm@12.2.0 ci
npx --yes npm@12.2.0 run dev
```

Read the server log for the URL. The default public configuration uses the `/qr-scanner/` path. The local static preview chooses an available port.

```sh
npx --yes npm@12.2.0 run check
npx --yes npm@12.2.0 test
npx --yes npm@12.2.0 run build
npx --yes npm@12.2.0 exec playwright -- install --with-deps
npx --yes npm@12.2.0 run test:browser
npx --yes npm@12.2.0 run test:performance
npx --yes npm@12.2.0 run preview
```

See [product behavior](docs/PRODUCT.md), [research](docs/RESEARCH.md), [toolchain](docs/TOOLCHAIN.md), [privacy and security](SECURITY.md) and [verification](docs/VERIFICATION.md).

## Boundaries

Files are limited to 20 MB, 24 million decoded pixels and 12,000 pixels per side. Large supported images are scaled proportionally to at most 4096 pixels per side before decoding. At most 16 codes are returned per scan. Downloads and worker operations have time limits. Browser image parsing still happens before most format dimensions can be checked, so these bounds are not a guarantee against every malicious compressed image.

GIF uses its first frame. SVG and PDF are not accepted. Camera hardware, clipboard permissions and image format support depend on the browser. Image links can fail due to CORS, connectivity, mixed content or a non-image response. Technical metadata is reported by the decoder, not inferred as a safety judgment.

## License

Software uses **AGPL-3.0-or-later**. Documentation and original educational prose use **CC-BY-SA-4.0**. Space Grotesk retains **OFL-1.1**. VINASIG marks follow the separate [Brand Usage Policy](BRAND_POLICY.md).

See [LICENSES.md](LICENSES.md) and [third party notices](THIRD_PARTY_NOTICES.md). Full software source, build instructions and exact dependency versions are available in this repository.
