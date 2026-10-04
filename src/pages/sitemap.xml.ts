import type { APIRoute } from 'astro';
import { siteURL } from '../../site.config.mjs';
export const GET: APIRoute = () =>
  new Response(
    '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>' +
      siteURL +
      '</loc></url><url><loc>' +
      siteURL +
      'en/</loc></url></urlset>',
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
