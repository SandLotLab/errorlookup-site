const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'codes.json');
const DOMAIN = 'https://errorlookup.com';

const baseCodes = [
  ...require(DATA_PATH).codes || require(DATA_PATH)
];

const guideDirs = fs.readdirSync(path.join(ROOT, 'guides'));
const slugByCode = new Map(guideDirs.map((d) => [Number(d.split('-')[0]), d]));

const CLASS_META = {
  1: { category: '1xx', class: 'informational', label: 'Informational' },
  2: { category: '2xx', class: 'success', label: 'Success' },
  3: { category: '3xx', class: 'redirect-codes', label: 'Redirection' },
  4: { category: '4xx', class: 'client-errors', label: 'Client Errors' },
  5: { category: '5xx', class: 'server-errors', label: 'Server Errors' }
};

const CATEGORY_PATHS = {
  informational: '/common/informational/',
  success: '/common/success/',
  'redirect-codes': '/common/redirect-codes/',
  'client-errors': '/common/client-errors/',
  'server-errors': '/common/server-errors/'
};

const comparisonMap = {
  301: ['/compare/301-vs-302/'],
  302: ['/compare/301-vs-302/'],
  401: ['/compare/401-vs-403/'],
  403: ['/compare/401-vs-403/', '/compare/403-vs-404/'],
  404: ['/compare/403-vs-404/']
};

function toPhrase(title) {
  const raw = String(title).replace(/^HTTP\s+\d+\s+/i, '').trim();
  const cleaned = raw.replace(/\s*\(.*\)\s*$/, '').trim();
  if (cleaned) return cleaned;
  if (/unused|obsoleted/i.test(raw)) return 'Unused';
  if (/unassigned/i.test(raw)) return 'Unassigned';
  return raw;
}

function statusFlag(title) {
  const t = title.toLowerCase();
  if (t.includes('unassigned')) return 'unassigned';
  if (t.includes('unused') || t.includes('obsoleted')) return 'unused';
  if (t.includes('temporary')) return 'temporary';
  return 'assigned';
}

function defaultCauses(code, label) {
  if (code === 404) return ['Broken internal link', 'Deleted page', 'Incorrect URL', 'Routing mismatch', 'Missing rewrite rule'];
  if (code === 500) return ['Unhandled exception', 'Application crash', 'Misconfiguration', 'Dependency failure'];
  if (code === 301) return ['Site migration', 'URL restructuring', 'Canonical redirect setup'];
  if (code === 302) return ['Temporary campaign page', 'A/B test routing', 'Short-term redirect logic'];
  if (label === 'Client Errors') return ['Malformed request format', 'Authentication or authorization mismatch', 'Missing resource or route'];
  if (label === 'Server Errors') return ['Unhandled server-side exception', 'Upstream service failure', 'Runtime configuration issue'];
  if (label === 'Redirection') return ['Resource moved to a different URI', 'Canonicalization or routing rule', 'Caching or method-preservation choice'];
  return ['Normal protocol behavior'];
}

function defaultFixes(code, label) {
  if (code === 404) return ['Verify the URL', 'Restore the resource if it was removed unintentionally', 'Add or correct server routing', 'Set up a redirect if the page moved', 'Update internal links'];
  if (code === 500) return ['Check server logs', 'Inspect recent deploys', 'Validate environment variables', 'Verify upstream services'];
  if (code === 301) return ['Point links to the destination URL', 'Use 301 only for permanent moves', 'Avoid redirect chains'];
  if (code === 302) return ['Use only for temporary moves', 'Switch to 301 or 308 if permanent', 'Test method preservation behavior where relevant'];
  if (label === 'Client Errors') return ['Validate request URL, method, and headers', 'Fix authentication/authorization flow', 'Correct client payload and retry'];
  if (label === 'Server Errors') return ['Review application and proxy logs', 'Rollback or patch unstable deployments', 'Check upstream dependencies and timeouts'];
  if (label === 'Redirection') return ['Confirm redirect destination and protocol', 'Prevent redirect chains/loops', 'Use the correct permanent vs temporary code'];
  return ['No fix needed'];
}

function makeCodeEntry(raw) {
  const code = Number(raw.code);
  const cls = Math.floor(code / 100);
  const meta = CLASS_META[cls];
  const phrase = toPhrase(raw.title);
  const slug = slugByCode.get(code) || `${code}-${phrase.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const status = statusFlag(raw.title);
  const title = `HTTP ${code} ${phrase || raw.title}`.trim();

  const summary = status === 'unused'
    ? `HTTP ${code} is reserved/unused and should not be emitted by modern applications.`
    : `HTTP ${code} ${phrase} indicates a ${meta.label.toLowerCase()} response outcome.`;

  const meaning = status === 'unused'
    ? 'This status code is reserved for historical use and should not be relied upon in modern implementations.'
    : status === 'unassigned'
      ? 'This status code value is currently unassigned in the IANA registry and should not be used in production APIs.'
      : `${phrase} describes how the server processed the request and what the client should do next.`;

  const entry = {
    code,
    slug,
    pathGuide: `/guides/${slug}/`,
    pathStatus: `/status/${code}/`,
    title,
    phrase,
    iana_name: phrase || raw.title,
    category: meta.category,
    class: meta.class,
    summary,
    meaning,
    causes: defaultCauses(code, meta.label),
    fixes: defaultFixes(code, meta.label),
    examples: {
      request: `GET /example HTTP/1.1\nHost: errorlookup.com`,
      response: `HTTP/1.1 ${code} ${phrase || ''}`.trim()
    },
    related: [],
    aliases: [`${code} ${phrase}`.toLowerCase(), `http ${code}`],
    keywords: [`http ${code}`, `${code} ${phrase}`.toLowerCase(), `${meta.label.toLowerCase()} status codes`],
    compare: comparisonMap[code] || [],
    faq: [],
    indexable: true,
    official: status !== 'unassigned',
    notes: status === 'unused' ? 'Marked as unused/reserved in modern HTTP usage.' : '',
    rfc: String(raw.reference || 'RFC 9110').replace(/\[|\]/g, '').split(',')[0],
    status
  };

  if (code === 404) {
    entry.faq = [
      { q: 'Does 404 mean the server is down?', a: 'No. It means the resource was not found at that URL.' },
      { q: 'Should I redirect all 404 pages?', a: 'Only when there is a relevant replacement resource.' }
    ];
    entry.examples = {
      request: 'GET /missing-page HTTP/1.1\nHost: errorlookup.com',
      response: 'HTTP/1.1 404 Not Found\nContent-Type: text/html'
    };
    entry.related = [400, 403, 410];
    entry.aliases = ['404 error', 'page not found'];
    entry.keywords = ['404 not found', 'http 404', 'page not found', 'broken link', 'resource missing'];
  }

  if (code === 500) {
    entry.examples = {
      request: 'GET /api/data HTTP/1.1\nHost: errorlookup.com',
      response: 'HTTP/1.1 500 Internal Server Error\nContent-Type: application/json'
    };
    entry.related = [502, 503, 504];
  }

  if (code === 301) {
    entry.related = [302, 307, 308];
    entry.examples = {
      request: 'GET /old-page HTTP/1.1\nHost: errorlookup.com',
      response: 'HTTP/1.1 301 Moved Permanently\nLocation: /new-page'
    };
  }

  if (code === 302) {
    entry.related = [301, 303, 307, 308];
    entry.examples = {
      request: 'GET /promo HTTP/1.1\nHost: errorlookup.com',
      response: 'HTTP/1.1 302 Found\nLocation: /promo-spring'
    };
  }

  if (code === 200) {
    entry.causes = ['Normal successful request'];
    entry.fixes = ['No fix needed'];
    entry.related = [201, 204, 206];
    entry.examples = { request: 'GET / HTTP/1.1\nHost: errorlookup.com', response: 'HTTP/1.1 200 OK\nContent-Type: text/html' };
  }

  if (code === 306) {
    entry.title = 'HTTP 306 Unused';
    entry.phrase = 'Unused';
    entry.iana_name = '(Unused)';
    entry.summary = 'This code is unused and reserved in historical context.';
    entry.meaning = 'Do not rely on this code in modern implementations.';
    entry.causes = [];
    entry.fixes = ['Use an assigned modern status code instead'];
    entry.examples = { request: '', response: '' };
    entry.related = [301, 302, 307, 308];
    entry.notes = 'Mark clearly as unused.';
    entry.status = 'unused';
  }

  if (!entry.related.length) {
    entry.related = [code - 1, code + 1].filter((n) => baseCodes.some((c) => Number(c.code) === n));
  }

  return entry;
}

const codes = baseCodes.map(makeCodeEntry);
const data = {
  site: {
    name: 'ErrorLookup',
    domain: 'https://errorlookup.com',
    defaultTitle: 'HTTP Status Code Lookup, Meanings, Causes, and Fixes',
    defaultDescription: 'Lookup HTTP status codes, understand what they mean, compare related errors, and find fixes for common server, client, and redirect issues.'
  },
  codes
};

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');

const adHead = '<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-REPLACE_ME" crossorigin="anonymous"></script>';

function pageHead({ title, description, canonical, extraJsonLd = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${DOMAIN}${canonical}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${DOMAIN}${canonical}">
  <meta name="twitter:card" content="summary">
  ${adHead}
  ${extraJsonLd}
  <link rel="stylesheet" href="/assets/css/site.css">
  <script defer src="/assets/js/theme.js"></script>
  <script defer src="/assets/js/site.js"></script>
  <script defer src="/assets/js/search.js"></script>
</head>
<body>
  <div data-include="/partials/header.html"></div>`;
}

const PAGE_END = '\n  <div data-include="/partials/footer.html"></div>\n</body>\n</html>\n';

function breadcrumbsJson(name, url, sectionName, sectionPath) {
  return `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${DOMAIN}/` },
      { '@type': 'ListItem', position: 2, name: sectionName, item: `${DOMAIN}${sectionPath}` },
      { '@type': 'ListItem', position: 3, name, item: `${DOMAIN}${url}` }
    ]
  })}</script>`;
}

function writePage(rel, content) {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

const websiteLd = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ErrorLookup',
  url: 'https://errorlookup.com/',
  potentialAction: {
    '@type': 'SearchAction',
    target: 'https://errorlookup.com/?q={search_term_string}',
    'query-input': 'required name=search_term_string'
  }
})}</script>`;

writePage('index.html', `${pageHead({
  title: 'ErrorLookup: HTTP Status Code Lookup, Meanings, Causes, and Fixes',
  description: data.site.defaultDescription,
  canonical: '/',
  extraJsonLd: websiteLd
})}
  <main class="container">
    <section class="hero">
      <h1>HTTP Status Code Lookup for Developers</h1>
      <p>Find HTTP status meanings, root causes, and practical fixes across redirects, client errors, and server failures.</p>
      <div data-include="/partials/search.html"></div>
    </section>
    <div class="grid">
      <div>
        <section class="section"><h2>What HTTP Status Codes Mean</h2><p>HTTP status codes communicate request outcomes from server to client. They are grouped into 1xx informational, 2xx success, 3xx redirection, 4xx client error, and 5xx server error classes.</p></section>
        <section class="section"><h2>Common HTTP Errors</h2><ul><li><a href="/guides/404-not-found/">404 Not Found meaning</a></li><li><a href="/guides/500-internal-server-error/">500 Internal Server Error</a></li><li><a href="/guides/401-unauthorized/">401 Unauthorized</a></li><li><a href="/guides/403-forbidden/">403 Forbidden</a></li></ul></section>
        <section class="section"><h2>Status Code Categories</h2><ul><li><a href="/common/informational/">1xx Informational</a></li><li><a href="/common/success/">2xx Success</a></li><li><a href="/common/redirect-codes/">3xx Redirect Codes</a></li><li><a href="/common/client-errors/">4xx Client Errors</a></li><li><a href="/common/server-errors/">5xx Server Errors</a></li></ul></section>
        <section class="section"><h2>Popular Comparisons</h2><ul><li><a href="/compare/301-vs-302/">301 vs 302</a></li><li><a href="/compare/401-vs-403/">401 vs 403</a></li><li><a href="/compare/403-vs-404/">403 vs 404</a></li></ul></section>
        <section class="section"><h2>Developer Resources</h2><ul><li><a href="/status-codes/">All status codes</a></li><li><a href="/guides/200-ok/">200 OK</a></li><li><a href="/guides/301-moved-permanently/">301 Moved Permanently</a></li><li><a href="/guides/302-found/">302 Found</a></li><li><a href="/guides/404-not-found/">404 Not Found</a></li><li><a href="/guides/500-internal-server-error/">500 Internal Server Error</a></li></ul></section>
      </div>
      <aside><div data-include="/partials/ads.html"></div></aside>
    </div>
  </main>${PAGE_END}`);

const grouped = {
  informational: codes.filter((c) => c.class === 'informational'),
  success: codes.filter((c) => c.class === 'success'),
  'redirect-codes': codes.filter((c) => c.class === 'redirect-codes'),
  'client-errors': codes.filter((c) => c.class === 'client-errors'),
  'server-errors': codes.filter((c) => c.class === 'server-errors')
};

writePage('status-codes/index.html', `${pageHead({
  title: 'HTTP Status Codes List: 1xx, 2xx, 3xx, 4xx, 5xx',
  description: 'Browse all HTTP status codes grouped by 1xx through 5xx classes with links to lookup and full guide pages.',
  canonical: '/status-codes/',
  extraJsonLd: breadcrumbsJson('Status Codes', '/status-codes/', 'Status Codes', '/status-codes/')
})}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav><h1>HTTP Status Codes List</h1>
  ${Object.entries(grouped).map(([k, list]) => `<section class="card"><h2>${list[0]?.category || ''} ${k.replace('-', ' ').replace(/\b\w/g, (x) => x.toUpperCase())}</h2><ul>${list.map((c) => `<li><a href="${c.pathStatus}">HTTP ${c.code}</a> — <a href="${c.pathGuide}">${c.phrase}</a></li>`).join('')}</ul></section>`).join('')}
  </main>${PAGE_END}`);

const categoryPages = [
  ['informational', 'Informational HTTP Status Codes – Full List and Explanations'],
  ['success', 'Success HTTP Status Codes – Full List and Explanations'],
  ['redirect-codes', 'Redirect Codes HTTP Status Codes – Full List and Explanations'],
  ['client-errors', 'Client Error HTTP Status Codes – Full List and Explanations'],
  ['server-errors', 'Server Error HTTP Status Codes – Full List and Explanations']
];

for (const [key, title] of categoryPages) {
  const list = grouped[key];
  writePage(`common/${key}/index.html`, `${pageHead({
    title,
    description: `Browse all ${title.replace(' – Full List and Explanations', '')} with meanings, examples, and related guides.`,
    canonical: CATEGORY_PATHS[key],
    extraJsonLd: breadcrumbsJson(title, CATEGORY_PATHS[key], 'Common', '/status-codes/')
  })}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav><h1>${title}</h1>
  <p>${title.replace(' – Full List and Explanations', '')} explain common response patterns for this HTTP class.</p>
  <section class="card"><h2>Code List</h2><ul>${list.map((c) => `<li><a href="${c.pathStatus}">HTTP ${c.code} ${c.phrase}</a> — ${c.summary} <a href="${c.pathGuide}">Guide</a></li>`).join('')}</ul></section>
  <section class="card"><h2>FAQ</h2><h3>How should I use this category?</h3><p>Use it to quickly narrow debugging between routing, authentication, redirects, and server-side failures.</p><h3>Where can I browse every class?</h3><p>Use the <a href="/status-codes/">status code hub</a>.</p></section>
  </main>${PAGE_END}`);
}

function comparisonPage(pathSlug, a, b) {
  const left = codes.find((c) => c.code === a);
  const right = codes.find((c) => c.code === b);
  const title = `${a} vs ${b} – Differences, Use Cases, and SEO Impact`;
  writePage(`compare/${pathSlug}/index.html`, `${pageHead({
    title,
    description: `Compare ${a} vs ${b}: differences, when to use each one, and common mistakes.`,
    canonical: `/compare/${pathSlug}/`,
    extraJsonLd: breadcrumbsJson(`${a} vs ${b}`, `/compare/${pathSlug}/`, 'Compare', '/compare/301-vs-302/')
  })}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav>
    <h1>${a} vs ${b}: ${left.phrase} vs ${right.phrase}</h1>
    <p>Both status codes appear frequently in production traffic but communicate different intent.</p>
    <div class="table-wrap"><table><thead><tr><th>Aspect</th><th>${a}</th><th>${b}</th></tr></thead><tbody><tr><td>Meaning</td><td>${left.meaning}</td><td>${right.meaning}</td></tr><tr><td>Typical use case</td><td>${left.summary}</td><td>${right.summary}</td></tr><tr><td>Operational note</td><td>Monitor cache/client behavior when returning ${a}.</td><td>Monitor cache/client behavior when returning ${b}.</td></tr></tbody></table></div>
    <section class="card"><h2>When to use one vs the other</h2><p>Choose the code that most accurately reflects semantics and expected client behavior.</p></section>
    <section class="card"><h2>FAQ</h2><h3>Can I swap these codes?</h3><p>No. Returning the wrong code can break clients, SEO expectations, or caching behavior.</p></section>
    <p>Related guides: <a href="${left.pathGuide}">${a}</a> · <a href="${right.pathGuide}">${b}</a></p>
  </main>${PAGE_END}`);
}
comparisonPage('301-vs-302', 301, 302);
comparisonPage('401-vs-403', 401, 403);
comparisonPage('403-vs-404', 403, 404);

for (const c of codes) {
  const guideTitle = `HTTP ${c.code} ${c.phrase} – Meaning, Causes, and Fixes`;
  const guideDesc = `Learn what HTTP ${c.code} ${c.phrase} means, why it happens, common causes, and how to fix it.`;
  const statusTitle = `HTTP ${c.code} Status Code – ${c.phrase}, Meaning, and Related Guides`;
  const statusDesc = `Lookup HTTP ${c.code} status code, see its official meaning, category, and related guides.`;

  const faqBlock = c.faq.length
    ? `<section class="card"><h2>FAQ</h2>${c.faq.map((f) => `<h3>${f.q}</h3><p>${f.a}</p>`).join('')}</section>`
    : `<section class="card"><h2>FAQ</h2><h3>Is HTTP ${c.code} officially assigned?</h3><p>${c.status === 'assigned' ? 'Yes. This code is assigned in the IANA registry.' : 'No. This code is not actively assigned for normal use.'}</p></section>`;

  const faqJson = c.faq.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: c.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) })}</script>` : '';

  const articleLd = `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: guideTitle,
    description: guideDesc,
    url: `${DOMAIN}${c.pathGuide}`,
    author: { '@type': 'Organization', name: 'ErrorLookup' },
    publisher: { '@type': 'Organization', name: 'ErrorLookup' }
  })}</script>`;

  writePage(`guides/${c.slug}/index.html`, `${pageHead({
    title: guideTitle,
    description: guideDesc,
    canonical: c.pathGuide,
    extraJsonLd: `${articleLd}${breadcrumbsJson(`${c.code} ${c.phrase}`, c.pathGuide, 'Guides', '/guides/')}${faqJson}`
  })}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav><article data-related-code="${c.code}">
    <h1>HTTP ${c.code} ${c.phrase}</h1>
    <p>${c.summary}</p>
    <section class="card"><h2>What it means</h2><p>${c.meaning}</p></section>
    <section class="card"><h2>Why it happens</h2><p>Common triggers include protocol conditions, routing decisions, and application behavior.</p></section>
    <section class="card"><h2>Common causes</h2><ul>${c.causes.map((x) => `<li>${x}</li>`).join('')}</ul></section>
    <section class="card"><h2>How to fix it</h2><ul>${c.fixes.map((x) => `<li>${x}</li>`).join('')}</ul></section>
    <section class="card"><h2>Example request/response</h2><pre>${c.examples.request}\n\n${c.examples.response}</pre></section>
    <section class="card"><h2>Browser/dev/server context</h2><p>Use browser network tools, server logs, and APM traces together when diagnosing HTTP ${c.code}.</p></section>
    <section class="card"><h2>Related status codes</h2><div id="related-links"></div></section>
    ${faqBlock}
  </article><script defer src="/assets/js/render-related.js"></script></main>${PAGE_END}`);

  writePage(`status/${c.code}/index.html`, `${pageHead({
    title: statusTitle,
    description: statusDesc,
    canonical: c.pathStatus,
    extraJsonLd: breadcrumbsJson(`HTTP ${c.code}`, c.pathStatus, 'Status', '/status-codes/')
  })}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav><article data-related-code="${c.code}">
    <h1>HTTP ${c.code} ${c.phrase}</h1>
    <p class="muted">Category: ${c.category} · Class: ${c.class}</p>
    <section class="card"><h2>Definition</h2><p>${c.meaning}</p></section>
    <section class="card"><h2>Reference</h2><p>${c.rfc}</p></section>
    <section class="card"><h2>Related guides</h2><p><a href="${c.pathGuide}">Read full guide</a></p><div id="related-links"></div></section>
  </article><script defer src="/assets/js/render-related.js"></script></main>${PAGE_END}`);
}

console.log(`Generated ${codes.length} status and guide pairs.`);
