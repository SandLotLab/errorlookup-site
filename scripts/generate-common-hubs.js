const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://errorlookup.com';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'codes.json'), 'utf8'));
const codes = data.codes || data;

const hubs = [
  {
    key: 'informational',
    h1: 'Informational HTTP Status Codes (1xx)',
    description: '1xx responses are interim protocol signals sent before a final response.',
    intro: 'Use this page when inspecting connection setup, request expectation handshakes, or early metadata delivery. 1xx codes are not terminal outcomes.',
    defines: 'These codes indicate that the server has received enough of the request to continue processing, but a final status code still follows.',
    checks: ['Verify whether your client library surfaces interim responses or hides them.', 'Confirm proxy/CDN behavior for Expect: 100-continue and early hints.', 'Check if application logging records only the final response and misses 1xx events.'],
    differentiate: '100/101 are transport or protocol negotiation signals, while 102/103 are processing and preloading hints. If you expected a final success/error code, inspect middleware and reverse-proxy handling.',
    escalate: 'Escalate when 1xx responses appear without a matching final response or when clients stall after interim headers.'
  },
  {
    key: 'success',
    h1: 'Success HTTP Status Codes (2xx)',
    description: '2xx responses indicate successful handling, but each code communicates different semantics.',
    intro: 'Use this hub to confirm that your API and web responses return the correct success semantics for creation, async processing, partial responses, and body expectations.',
    defines: 'A 2xx code means the request was accepted and processed according to protocol, but payload shape, idempotency, and downstream behavior vary by exact code.',
    checks: ['Match response code to method semantics (GET/POST/PUT/DELETE).', 'Verify whether the endpoint should return a body (200) or intentionally omit one (204).', 'For async workflows, confirm you return 202 only when processing is not complete.'],
    differentiate: '200/201/202/204 are commonly swapped incorrectly. Choose based on resource creation and processing completion, not convenience.',
    escalate: 'Escalate when clients depend on one success code but backend teams return another, causing contract or SDK mismatches.'
  },
  {
    key: 'redirect-codes',
    h1: 'Redirect HTTP Status Codes (3xx)',
    description: '3xx responses control URL movement, cache behavior, and method preservation.',
    intro: 'Use this page when debugging canonicalization, domain migrations, trailing slash rules, and redirect chains across app, CDN, and origin.',
    defines: '3xx codes tell the client to fetch a different URL or reuse a stored response. Permanent vs temporary intent and method rewriting rules matter.',
    checks: ['Trace full redirect chain and remove unnecessary hops.', 'Validate Location headers are absolute/relative as expected by clients.', 'Confirm whether request method must be preserved (307/308) or can change (301/302/303 behavior differs by client).'],
    differentiate: '301/308 are permanent; 302/307 are temporary. 303 explicitly redirects to a retrieval target. Pick the code that matches both duration and method behavior.',
    escalate: 'Escalate when crawlers index the wrong URL, loops occur, or API clients fail due to method/body changes after redirect.'
  },
  {
    key: 'client-errors',
    h1: 'Client Error HTTP Status Codes (4xx)',
    description: '4xx responses indicate request, authentication, authorization, or resource state problems on the caller side.',
    intro: 'Use this hub to distinguish malformed requests from auth failures, permission denials, missing resources, and precondition conflicts.',
    defines: '4xx means the server understood the request class but cannot process it as sent. The caller usually needs to change URL, headers, auth, or payload before retrying.',
    checks: ['Reproduce with raw request logging to confirm method, path, and headers.', 'Validate auth tokens, scopes, and session state before assuming routing issues.', 'Inspect payload schema, content type, and conditional headers for contract violations.'],
    differentiate: '401 vs 403 vs 404 and 409 vs 412 vs 422 are common misclassifications. Return the code that best describes what the caller must change.',
    escalate: 'Escalate when different services in the same flow return inconsistent 4xx semantics for the same failure condition.'
  },
  {
    key: 'server-errors',
    h1: 'Server Error HTTP Status Codes (5xx)',
    description: '5xx responses indicate server-side, upstream, or infrastructure failures after a valid request reached the service.',
    intro: 'Use this hub during incidents to separate application crashes, gateway failures, overload, timeout conditions, and unsupported protocol handling.',
    defines: '5xx means the server or an upstream dependency failed to fulfill a request that was syntactically valid from the client perspective.',
    checks: ['Start with request-correlated application logs and reverse-proxy logs.', 'Check dependency health (database, cache, third-party APIs) before retry storms spread.', 'Review deploy timeline and configuration changes around first error spike.'],
    differentiate: '500 is generic app failure, 502/504 usually indicate upstream or gateway path issues, and 503 often indicates overload or maintenance mode.',
    escalate: 'Escalate when error rate crosses SLO thresholds, retries amplify load, or cross-region infrastructure components fail simultaneously.'
  }
];

const googleTag = `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=G-75H3P692GN"></script>\n<script>\n  window.dataLayer = window.dataLayer || [];\n  function gtag(){dataLayer.push(arguments);}\n  gtag('js', new Date());\n  gtag('config', 'G-75H3P692GN');\n</script>`;

function classForKey(key) {
  if (key === 'informational') return '1xx';
  if (key === 'success') return '2xx';
  if (key === 'redirect-codes') return '3xx';
  if (key === 'client-errors') return '4xx';
  return '5xx';
}

for (const hub of hubs) {
  const cls = classForKey(hub.key);
  const list = codes.filter((c) => c.category === cls);
  const codeList = list
    .map((c) => `<li><a href="${c.pathGuide}">HTTP ${c.code} ${c.phrase}</a> — ${c.summary}</li>`)
    .join('');

  const html = `<!doctype html>
<html lang="en"><head>
${googleTag}

<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${hub.h1} | ErrorLookup</title><meta name="description" content="${hub.description}"><link rel="canonical" href="${DOMAIN}/common/${hub.key}/"><meta property="og:title" content="${hub.h1}"><meta property="og:description" content="${hub.description}"><meta property="og:url" content="${DOMAIN}/common/${hub.key}/"><meta name="twitter:card" content="summary"><link rel="stylesheet" href="/assets/css/site.css"><script defer src="/assets/js/site.js"></script>
<script defer src="/assets/js/theme.js"></script>
</head><body>
<div data-include="/partials/header.html"></div><main class="container"><nav class="breadcrumbs"><a href="/">Home</a> / <a href="/status-codes/">Status Codes</a> / ${hub.h1}</nav><h1>${hub.h1}</h1><p>${hub.intro}</p>
<section class="card"><h2>What this group covers</h2><p>${hub.defines}</p></section>
<section class="card"><h2>What to check first</h2><ul>${hub.checks.map((i) => `<li>${i}</li>`).join('')}</ul></section>
<section class="card"><h2>How related ${cls} codes differ</h2><p>${hub.differentiate}</p></section>
<section class="card"><h2>${hub.h1} list with quick summaries</h2><ul>${codeList}</ul></section>
<section class="card"><h2>When to escalate</h2><p>${hub.escalate}</p></section>
<section class="card"><h2>Next steps</h2><p><a href="/status-codes/">Browse all status classes</a> · <a href="/compare/">Compare similar codes</a> · <a href="/faq/">Read implementation FAQ</a></p></section></main><div data-include="/partials/footer.html"></div>
</body></html>
`;

  const out = path.join(ROOT, 'common', hub.key, 'index.html');
  fs.writeFileSync(out, html);
}

console.log(`Generated ${hubs.length} common hub pages.`);
