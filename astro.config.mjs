import { defineConfig } from 'astro/config';
import { siteOrigin, siteBase } from './site.config.mjs';
export default defineConfig({
  site: siteOrigin,
  base: siteBase,
  output: 'static',
  build: { format: 'directory', inlineStylesheets: 'never' },
  vite: { worker: { format: 'es' } },
});
