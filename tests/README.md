# Tests

Fixtures are generated locally in ignored output/fixtures using fictional payloads. No real QR secrets, user photos or camera frames are committed.

Unit tests cover content recognition, URL action restrictions, Wi-Fi escaping, private authentication fields, vCard folding and repeated numbers, metadata fallback, image signatures and size limits.

Browser tests exercise actual reader WASM for text, URL, Wi-Fi, email, phone, SMS, contact, location, calendar, authentication and injection-like payloads. Additional fixtures cover specified error correction/version/mask, multiple codes, Micro QR, rectangular QR and no-code images.

Paste and drag events run on every browser engine. Chromium additionally uses a browser clipboard image and actual Control+V keyboard input. Camera success uses a synthetic video stream on supported engines. Permission denial and no automatic camera request run on all engines.

No test submits real data, changes DNS, makes a payment, opens decoded links or activates physical camera hardware.

Responsive screenshots retain route, viewport, theme and state names. Browser failures retain traces, screenshots and a HTML report under output/playwright. Never replace assertions or accept an unread screenshot simply to pass.

Firefox discards file items in its synthetic ClipboardEvent constructor. The cross-engine paste/drop fixture supplies the native event data shape explicitly. Real ClipboardItem plus Ctrl + V is a separate Chromium test. Long scrollable payloads are labeled and keyboard focusable.
