import type { APIRoute } from 'astro';
import { siteURL } from '../../site.config.mjs';
export const GET: APIRoute = () =>
  new Response(
    'User-agent: *\nAllow: /\nSitemap: ' + siteURL + 'sitemap.xml\n',
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
