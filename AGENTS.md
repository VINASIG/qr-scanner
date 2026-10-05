# VINASIG QR Scanner

Read README.md, docs/PRODUCT.md, docs/RESEARCH.md, docs/TOOLCHAIN.md, docs/BRAND.md and LICENSES.md. This new static Astro/TypeScript product reads QR codes locally.

- Root is Vietnamese and /en/ is English. Use the adopted VINASIG design tokens, unchanged transparent header logos linking to https://vinasig.io.vn/, local Space Grotesk and Lucide icons. Both themes and every dynamic message are localized.
- Provide image paste including Ctrl+V/Cmd+V, drag/drop, file input, explicitly requested HTTP(S) image retrieval and front/back camera. Never read clipboard or start camera without user action. Stop camera tracks on reset, page hide, navigation, source change and successful detection. Never send image pixels or QR content to a decoding API, persist inputs, or automatically open decoded links.
- Decode on a worker using the exact locked ZXing reader and matching self-hosted WASM. Bound file bytes, image pixels, network time and decoding time. Abort stale work and free streams, bitmaps, workers and object URLs. Protect output with textContent, safe HTTP(S) links and explicit actions. Show all decoded results. Preserve original text and bytes. Keep technical details collapsed and report unavailable fields truthfully.
- QR payload syntax is user content, not authored prose. Keep Wi-Fi credentials and authentication secrets in collapsed details. All downloads and clipboard writes are explicit actions. Explain remote image servers receive a request and CORS may require downloading the image first. Never use a proxy to bypass access controls.
- Apply the pinned VINASIG controls, writing, responsive and licensing rules. Verify errors, reset, keyboard, long payloads, script failure, forced colors, camera permission failure and resource cleanup. No OS dropdown/date/color picker is needed for the initial interface. Style file triggers, radio choices, progress and disclosures.
- Run check, unit, build, browser and performance gates. Use fixture images and fake camera/clipboard permission paths for deterministic tests. Capture and OPEN screenshots across the standard viewport matrix, breakpoint neighbors, 320 px and 200% text, both languages and themes. Never describe fixture camera coverage as real hardware verification.
- Software uses AGPL-3.0-or-later, prose CC-BY-SA-4.0, fonts retain OFL-1.1 and marks retain the separate brand policy. Preserve original upstream license notices and asset bytes. Keep build sources and source revision available to users.
- Current owner authorization permits this new VINASIG repository, commit, push and public deployment. Preserve all sibling repositories. Review staged diff, remote HEAD, exact-revision CI and live routes. Artifacts stay in ignored output/. Independent SI-agent trials, physical devices, screen readers and field performance are NOT_RUN unless actually observed. Respond in Vietnamese and write technical docs/commits in English.
## Shared header and footer

Read docs/SITE_CHROME.md before header or footer changes. Keep shared chrome consistent and run npm run test:chrome.

<!-- VINASIG STANDARDS BEGIN -->
## VINASIG SI agent standards 0.1.0

Read `.vinasig/standards/policies/core.md` and `language.md` before repository work. Respect platform instructions, current user authorization and local project guidance. Preserve unrelated changes. Never invent verification or weaken a quality gate to pass.

Active profile is `web-typescript`. Read `.vinasig/standards/profiles/web-typescript.md` and the task-relevant policies. Core is valid for CLI and documentation projects and installs no browser dependencies.

Use `$vinasig-workflow` for implementation work and `$vinasig-dependencies` when adding or upgrading dependencies. Report PASS, FAIL, NOT_RUN or NOT_APPLICABLE with evidence and reasons. Commit, push and publish only within the task authorization.

For license selection, imported material or distribution changes read `policies/licensing.md` and `LICENSES.md` inside the snapshot. LIC-001 through LIC-004 require purpose-based selection, authority and dependency review, separate documentation/font/data/brand rights, consistent SPDX metadata and delivery evidence. Importing this standard does not relicense the host project.

For UI changes read `policies/web.md` inside the snapshot. Apply LANG-004/LANG-005 to all visible copy and locales. WEB-001 requires original transparent header logos matched to the actual surface, without a padded or rounded logo card, linking to https://vinasig.io.vn/. Run inspectHeaderBrand and exercise the logo link on local and deployed pages. WEB-008 requires a full control inventory and styled initial/open/scrolled states, including popup scrollbars, checkbox/radio, search clear, range/progress parts and disclosure indicators. Use the reviewed control-surfaces CSS, preserve native form/keyboard/touch behavior and test forced colors. Run inspectControlSurfaces and inspectControlIndicators with nonzero expected counts. Ordinary dropdown indicators need a measured 16 px inner trailing inset, a 12 px value gap and their declared SVG size. Open before/after and deployed screenshots. Use `$vinasig-responsive` for layout/accessibility, `$vinasig-motion` for movement, `$vinasig-search` for SEO/AEO/GEO, `$vinasig-performance` for speed, and `$vinasig-agent-readiness` for browser-agent tasks. Space Grotesk, Lucide and Simple Icons follow their separate roles.

The local manifest pins the approved snapshot. A Markdown path is a reading instruction, not an automatic import. Stop and report unresolved conflicts with mandatory policy. Record approved exceptions with owner, reason and review date.
<!-- VINASIG STANDARDS END -->
