# Deployment

The initial website is https://vinasig.github.io/qr-scanner/. The repository is public and publishes static output through GitHub Pages Actions only after verification.

## Configuration

site.config.mjs provides SITE_ORIGIN and SITE_BASE, with a GitHub Pages project path as the safe default. Every application asset, language link, canonical, social URL, robots and sitemap uses that configuration. The local preview also serves the same base path.

PUBLIC_BUILD_REVISION is set to the workflow commit so the published source link and distribution notice identify the matching revision.

## Intended custom domain

The preferred future domain is scan.vinasig.io.vn. The available in-app browser currently opens the Cloudflare login screen, so no DNS change can be verified from the present session. No existing DNS record was changed.

After access is available:

1. Add a DNS-only CNAME named scan pointing to vinasig.github.io.
2. Set the Pages custom domain to scan.vinasig.io.vn and verify the DNS check.
3. Set repository Actions variables SITE_ORIGIN to https://scan.vinasig.io.vn and SITE_BASE to /. The workflow passes the same settings to verification and the published build.
4. Build and run all local and CI checks against that configuration.
5. Let GitHub issue the certificate, enable HTTPS and verify both language pages and all worker assets.
6. Update the repository homepage and this deployment record after the domain actually serves the checked revision.

scripts/notices.ts generates a CNAME in the build only for a configured custom hostname. The repository does not claim the custom domain is active before those checks pass.

## CI

The verification matrix runs Ubuntu and Windows with Chromium, Firefox and WebKit. Each job checks source, unit tests, build and browser behavior. Linux Chromium additionally runs the Lighthouse budgets. The deployment depends on the entire verification matrix, uses minimal Pages permissions and retains build and test evidence.

No QR or camera data is published. Test fixtures use fictional data. There are no secrets in the static output.
