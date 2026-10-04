export const siteOrigin =
  process.env['SITE_ORIGIN'] ?? 'https://vinasig.github.io';
const configuredBase = process.env['SITE_BASE'] ?? '/qr-scanner/';
if (
  !configuredBase.startsWith('/') ||
  !configuredBase.endsWith('/') ||
  configuredBase.includes('..') ||
  configuredBase.includes('?') ||
  configuredBase.includes('#')
)
  throw new Error('SITE_BASE must be a rooted directory path');
export const siteBase = configuredBase;
export const siteURL = new URL(siteBase, siteOrigin).href;
