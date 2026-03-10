const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://errorlookup.com';

const staticPaths = [
  '/',
  '/status-codes/',
  '/common/informational/',
  '/common/success/',
  '/common/redirect-codes/',
  '/common/client-errors/',
  '/common/server-errors/',
  '/compare/301-vs-302/',
  '/compare/401-vs-403/',
  '/compare/403-vs-404/'
];

function loadCodes() {
  const file = path.join(ROOT, 'data', 'codes.json');
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function xmlEscape(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function makeUrl(loc, priority = '0.7', changefreq = 'weekly') {
  const lastmod = new Date().toISOString().split('T')[0];
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    '  </url>'
  ].join('\n');
}

function main() {
  const raw = loadCodes();
  const codes = raw.codes || [];

  const urls = new Map();

  staticPaths.forEach((p) => {
    const priority = p === '/' ? '1.0' : '0.8';
    urls.set(`${DOMAIN}${p}`, makeUrl(`${DOMAIN}${p}`, priority));
  });

  codes.forEach((item) => {
    if (item.indexable !== false) {
      if (item.pathGuide) urls.set(`${DOMAIN}${item.pathGuide}`, makeUrl(`${DOMAIN}${item.pathGuide}`, '0.8'));
      if (item.pathStatus) urls.set(`${DOMAIN}${item.pathStatus}`, makeUrl(`${DOMAIN}${item.pathStatus}`, '0.7'));
    }
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...Array.from(urls.values()),
    '</urlset>'
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), xml, 'utf8');
  console.log(`Generated sitemap.xml with ${urls.size} URLs`);
}

main();
