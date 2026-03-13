const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://errorlookup.com';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'codes.json'), 'utf8'));
const codes = data.codes || data;
const byCode = new Map(codes.map((c) => [Number(c.code), c]));

const classChecks = {
  informational: ['Confirm whether your tooling records interim responses.', 'Check proxy/client support for interim status handling.', 'Verify a final non-1xx response is eventually returned.'],
  success: ['Confirm response code matches endpoint contract.', 'Check response body expectations (e.g., 200 vs 204).', 'Validate async vs sync semantics (e.g., 202).'],
  'redirect-codes': ['Inspect Location header correctness.', 'Check redirect chain depth and loops.', 'Validate permanent vs temporary intent.'],
  'client-errors': ['Capture exact request path, method, and headers.', 'Verify authentication and authorization context.', 'Validate payload schema and content type.'],
  'server-errors': ['Correlate request ID across edge, proxy, and app logs.', 'Check upstream dependency health and timeouts.', 'Review recent deploy or config changes.']
};

function ownerHint(c) {
  if (c.class === 'client-errors') return 'Client request or identity context is usually the first place to fix.';
  if (c.class === 'server-errors') return 'Service, gateway, or upstream dependency is usually the first place to investigate.';
  if (c.class === 'redirect-codes') return 'Routing and canonicalization rules are usually responsible for behavior.';
  return 'Interpret this code in protocol context before changing application logic.';
}

for (const c of codes) {
  const related = (c.related || []).map((n) => byCode.get(Number(n))).filter(Boolean);
  const relatedList = related.length
    ? `<ul>${related.map((r) => `<li><a href="${r.pathStatus}">HTTP ${r.code} ${r.phrase}</a> — <a href="${r.pathGuide}">full guide</a></li>`).join('')}</ul>`
    : '<p>No direct related code links are available.</p>';

  const html = `<!doctype html>
<html lang="en"><head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-75H3P692GN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-75H3P692GN');
</script>

<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>HTTP ${c.code} Status Code – ${c.phrase}, Meaning, and Related Guides</title>
<meta name="description" content="Lookup HTTP ${c.code} ${c.phrase}: meaning, first checks, similar codes, and where to continue troubleshooting.">
<link rel="canonical" href="${DOMAIN}${c.pathStatus}">
<meta property="og:title" content="HTTP ${c.code} Status Code – ${c.phrase}, Meaning, and Related Guides">
<meta property="og:description" content="Technical lookup reference for HTTP ${c.code} ${c.phrase}.">
<meta property="og:url" content="${DOMAIN}${c.pathStatus}">
<meta name="twitter:card" content="summary">
<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${DOMAIN}/` },
    { '@type': 'ListItem', position: 2, name: 'Status Codes', item: `${DOMAIN}/status-codes/` },
    { '@type': 'ListItem', position: 3, name: `HTTP ${c.code}`, item: `${DOMAIN}${c.pathStatus}` }
  ]
})}</script>
<link rel="stylesheet" href="/assets/css/site.css"><script defer src="/assets/js/theme.js"></script><script defer src="/assets/js/site.js"></script><script defer src="/assets/js/search.js"></script>
</head>
<body>
<div data-include="/partials/header.html"></div>
<main class="container"><nav class="breadcrumbs"><a href="/">Home</a> / <a href="/status-codes/">Status Codes</a> / HTTP ${c.code}</nav><article>
<h1>HTTP ${c.code} ${c.phrase}</h1>
<p>${c.summary}</p>
<section class="card"><h2>What this status code means</h2><p>${c.meaning}</p></section>
<section class="card"><h2>Who should act first</h2><p>${ownerHint(c)}</p></section>
<section class="card"><h2>What to check first</h2><ul>${(classChecks[c.class] || []).map((x) => `<li>${x}</li>`).join('')}</ul></section>
<section class="card"><h2>How it differs from similar codes</h2>${relatedList}</section>
<section class="card"><h2>Reference and next step</h2><p>Specification: ${c.rfc}.</p><p><a href="${c.pathGuide}">Read the full troubleshooting guide for HTTP ${c.code}</a> · <a href="/common/${c.class}/">Open the ${c.category} hub</a> · <a href="/compare/">Compare adjacent codes</a></p></section>
</article></main>
<div data-include="/partials/footer.html"></div>
</body></html>
`;

  const out = path.join(ROOT, 'status', String(c.code), 'index.html');
  fs.writeFileSync(out, html);
}

console.log(`Generated ${codes.length} enriched status reference pages.`);
