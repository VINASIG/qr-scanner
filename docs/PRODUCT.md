# Product

QR Scanner is a small, local QR reader. Vietnamese is the default language. English is at `/en/` within the configured base path.

## Primary flow

1. Paste an image, drop an image or choose a file.
2. The image is scanned immediately. There is no separate submit button.
3. Read each result, inspect structured fields or expand original contents.
4. Copy contents, save text or download the complete result report when requested.
5. Clear removes the input, preview, results and outstanding work.

The shared QR image intake contains a native paste target and adjacent Choose image, Paste image and Camera actions in a wrapping row. File formats and keyboard/camera instructions live in folded help. Image paste is global when the paste event contains an image. Ordinary text pasting into other inputs remains unchanged. A pasted image link outside an input or into the QR paste target opens and fills the image URL field. It waits for Enter or the scan action before fetching.

## Secondary flows

Image URL begins collapsed, with one accessible field label and a compact field/Scan row. Remote retrieval is an explicit request. Failure guidance sits beside the affected field. Camera controls remain hidden until Camera is clicked; Cancel is available during permission acquisition.

The camera starts only after a user action, preferring a rear camera when available. After permission, the preview and active device label appear. Switch camera is available only when post-permission enumeration finds multiple cameras; it releases the current stream before requesting the next device. Device identifiers stay in memory. Enumeration failure leaves scanning available. Camera tracks stop on success, Stop/Escape, reset, source change, hidden page or navigation. Late permission cannot detach a newer stream. Only one decode is outstanding at a time.

Results from a previous source are cleared before scanning the next. Late downloads, camera permissions and decoder replies cannot replace newer results.

## Results

All detected codes are shown up to the 16-code limit. The decoder's original text and bytes are retained. Structured views improve readability without changing the QR data. Sensitive Wi-Fi and authentication contents begin inside a closed disclosure. Technical details and raw metadata also begin collapsed.

Only reviewed HTTP or HTTPS URLs without credentials receive an open action. No decoded command executes. QR text cannot inject HTML. The complete report includes all decoded values, byte arrays, geometry, metadata, image dimensions, timing and decoder version/source commit.

## Limits and progressive behavior

Accepted image containers are PNG, JPEG, WebP, GIF, BMP and AVIF, subject to browser decoding support. GIF uses the first frame. The tool rejects unsupported, empty, oversized and unreadable inputs.

JavaScript is required for local decoding. Without it, interactive controls stay disabled and an explanation remains visible. Theme and language controls use the adopted VINASIG pattern. No OS select, date or color popup is needed.
