# Research

Reviewed on 5 October 2026.

## Decoder

[ZXing WebAssembly](https://github.com/Sec-ant/zxing-wasm) exposes the ZXing C++ reader as an ES module. Version 3.1.4 was the stable npm release at review time. Its reader-only WebAssembly is used, rather than its writer or full bundle, to reduce shipping size.

The reader supports QR families including ordinary QR, Micro QR and rectangular QR. Scans use the QR symbology family, rotation and inversion recovery, plain text rendering, valid results only and a maximum of 16 symbols.

ReadResult exposes original bytes, ECI bytes, Unicode text, orientation, mirroring, inversion, structured append, position and extra metadata. Known extra keys include Version, ECLevel, DataMask and UEC. The app retains extra metadata verbatim and marks unsupported fields as not reported. A QR can encode arbitrary bytes, so a readable text interpretation does not replace the original bytes.

The installed reader reports ordinary codes as `QRCode`. The known fixture with version 3, H correction and mask 5 is checked against actual reader output. A module grid comes from the reader symbol dimensions when available. A mathematical fallback is limited to explicitly identified Model 2 versions 1 through 40. No grid is guessed for other variants.

Transparent raster images are composited onto white before pixel decoding, so a black QR on a transparent background keeps its contrast. Inverted opaque QR images are handled by the decoder's inversion recovery.

The application pins the package and self-hosts its matching WASM. The build checks the upstream published SHA-256. The worker overrides locateFile so it never uses the package's default CDN location.

## Clipboard

[MDN Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API) describes secure context, permission and user activation restrictions. A normal paste event is the main desktop path. The paste button uses clipboard.read only after a click and offers keyboard or file recovery when unsupported or denied. The app never polls the clipboard.

## Camera

[MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) documents explicit permission, secure contexts and facingMode constraints. Facing mode is an ideal preference to support desktop cameras without a rear camera. Device labels report the chosen device. No audio track is requested. The app releases every obtained track.

Browser tests use a synthetic canvas video stream for scan and cleanup behavior. Those tests do not prove physical front/back hardware works on every phone. Permission and missing capability tests run separately.

## Remote image access

[MDN cross-origin images](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image) explains why foreign images can be unavailable to canvas or browser fetch. Retrieval uses CORS, omits credentials and sends no referrer. It does not use a relay service. Read failures lead to downloading the image first.

## Encoded content

The structured views recognize common Wi-Fi, mailto, tel, SMS/SMSTO, vCard/MECARD, geo, iCalendar and otpauth payload shapes. QR symbology stores data and does not guarantee another application's interpretation of these formats. The original payload remains accessible in every case. Calendar dates are displayed as encoded rather than inventing a timezone.

A decoded URL is not evidence of a safe destination. The scanner offers no automatic navigation, sends no contents to a reputation service and never executes javascript, data, file or intent payloads.

## Security tool dependency review

[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects braces through 3.0.3. The registry and advisory report no patched release at review time. It is used by development lint glob tooling. Production browser dependencies are separate, and QR contents are never used as lint glob patterns. See SECURITY.md for the dated mitigation and remaining audit finding.
