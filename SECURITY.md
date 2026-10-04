# Security and privacy

Decode only trusted image containers within bounded bytes and pixels. SVG, PDF and non-image files are not accepted. Browser image parsing is outside the application decoder worker and may still allocate memory before dimensions become available. The scanner is not a sandbox for hostile files.

The reader worker uses a self-hosted, SHA-256-checked WASM. Fetch and decode work have time limits. New sources and clear cancel old work. Camera requests are explicit, have no audio and stop their tracks on success, stop, reset, hidden page, source change or navigation.

QR output is written through textContent and DOM creation. It is never inserted as HTML. Only explicit credential-free HTTP or HTTPS links receive an open action. Such a link is not guaranteed safe. No decoded navigation or command runs automatically.

Images, decoded content, secrets and camera frames are not uploaded or stored. No history, analytics, cookies or background clipboard polling is implemented. Theme preference uses localStorage. Remote image scans contact the specified host without cookies or a referrer. That host may log requests.

Wi-Fi and authentication secrets begin collapsed. Original bytes and full reports can also contain sensitive information. Copy and download are explicit actions. Anyone with access to a saved report can read its contents.

## Dependency audit exception

Reviewed 5 October 2026. Review again by 5 November 2026 or on the next dependency update.

The full development audit currently reports seven high-severity entries from one root advisory, GHSA-vfj7-8cjw-p6xm, in braces 3.0.3 and its Stylelint/glob consumers. The official advisory reports no patched version. The current registry version is 3.0.3.

Mitigation is to keep lint patterns fixed in reviewed scripts and never supply QR payloads, filenames or remote data as glob patterns. This dependency runs during development checks, not in the browser decoder. The production audit is recorded separately. Do not downgrade Stylelint to npm audit's suggested obsolete major or suppress the audit result.

VINASIG's task owner authorized technical decisions for this new project. This dated development-only exception preserves strict linting while keeping the unresolved upstream advisory visible. Dependabot remains enabled. When a compatible fix exists, update, rerun the complete checks and remove the exception.

Use the repository's GitHub security reporting feature if enabled, or report a non-sensitive issue without including credentials, private QR contents or real image data.
