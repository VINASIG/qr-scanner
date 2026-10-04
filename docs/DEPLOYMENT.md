# Deployment

The canonical website is https://scan.vinasig.io.vn/. The repository publishes checked static output through GitHub Pages Actions at the origin root.

## Configuration

site.config.mjs defaults to SITE_ORIGIN https://scan.vinasig.io.vn and SITE_BASE /. The workflow uses those same defaults. An explicitly reviewed alternative deployment can set repository Actions variables with the same names. Every asset, worker, language link, canonical, social URL, robots file and sitemap uses this configuration. The local preview serves the configured base too.

PUBLIC_BUILD_REVISION is set to the workflow commit so the published source link and distribution notice identify the matching revision.

## DNS and HTTPS

The owner authorized this migration on 5 October 2026. The Cloudflare DNS record is a DNS-only CNAME named scan pointing to vinasig.github.io, with automatic TTL. The Pages custom domain is scan.vinasig.io.vn. GitHub approved its certificate and HTTPS enforcement was enabled and verified through the Pages API on that date. Preserve the other organization DNS records.

After any domain change:

1. Verify the CNAME and Pages custom-domain setting.
2. Build and run local and CI checks with the same origin-root configuration.
3. Let GitHub approve the certificate, enable HTTPS and verify both language pages, decoder worker and WASM.
4. Check the source revision, canonical and alternate URLs, robots.txt and sitemap.xml.
5. Update the repository homepage only after the domain serves the checked revision.

scripts/notices.ts generates a CNAME for a configured custom hostname. The Pages custom-domain setting remains necessary for an Actions deployment. A local build alone does not establish public delivery.

## Search submission

Submit https://scan.vinasig.io.vn/sitemap.xml in the existing Search Console Domain property for vinasig.io.vn after HTTPS is reachable. It contains Vietnamese / and English /en/. Do not duplicate an existing sitemap. Report submission and fetching status separately from indexing and ranking.

## CI

The verification matrix runs Ubuntu and Windows with Chromium, Firefox and WebKit. Each job checks source, unit tests, build and browser behavior. Linux Chromium additionally runs the Lighthouse budgets. The deployment depends on the entire verification matrix, uses minimal Pages permissions and retains build and test evidence.

No QR or camera data is published. Test fixtures use fictional data. There are no secrets in the static output.
