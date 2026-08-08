import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { getSeoMetadata } from '../src/lib/seo.js';

const SITE_URL = 'https://www.sf-explorer.net';

export const PUBLIC_SEO_ROUTES = [
  { path: '/' },
  { path: '/discover' },
  { path: '/works/novels' },
  { path: '/works/cinema' },
  { path: '/works/games' },
  { path: '/works/animation' },
  { path: '/media/media' },
  { path: '/media/classic-films' },
  { path: '/exploration-log' },
  { path: '/questions' },
  { path: '/network' },
];

export function buildSitemap() {
  const urls = PUBLIC_SEO_ROUTES.map(route => `  <url>
    <loc>${SITE_URL}${route.path}</loc>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function replaceMetaContent(html, attribute, name, content) {
  const pattern = new RegExp(`<meta ${attribute}="${name}" content="[^"]*" \\/>`);
  return html.replace(pattern, `<meta ${attribute}="${name}" content="${escapeHtml(content)}" />`);
}

export function buildRouteHtml(template, metadata) {
  let html = template.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(metadata.title)}</title>`,
  );
  html = replaceMetaContent(html, 'name', 'description', metadata.description);
  html = replaceMetaContent(html, 'name', 'robots', metadata.robots);
  html = html.replace(
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`,
  );
  html = replaceMetaContent(html, 'property', 'og:title', metadata.title);
  html = replaceMetaContent(html, 'property', 'og:description', metadata.description);
  html = replaceMetaContent(html, 'property', 'og:url', metadata.canonical);
  html = replaceMetaContent(html, 'property', 'og:image', metadata.image);
  html = replaceMetaContent(html, 'property', 'og:image:type', 'image/png');
  html = replaceMetaContent(html, 'name', 'twitter:title', metadata.title);
  html = replaceMetaContent(html, 'name', 'twitter:description', metadata.description);
  return replaceMetaContent(html, 'name', 'twitter:image', metadata.image);
}

export async function generateSeoAssets({
  distDir = 'dist',
} = {}) {
  const indexPath = path.resolve(distDir, 'index.html');
  const template = await readFile(indexPath, 'utf8');

  await writeFile(indexPath, buildRouteHtml(template, getSeoMetadata('/')), 'utf8');
  await writeFile(path.resolve(distDir, 'sitemap.xml'), buildSitemap(), 'utf8');

  for (const route of PUBLIC_SEO_ROUTES.filter(item => item.path !== '/')) {
    const outputPath = path.resolve(distDir, 'seo', `${route.path.slice(1)}.html`);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, buildRouteHtml(template, getSeoMetadata(route.path)), 'utf8');
  }
}

const currentModulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentModulePath) {
  await generateSeoAssets();
}
