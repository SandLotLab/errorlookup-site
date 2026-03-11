const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DOMAIN = 'https://errorlookup.com';
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'codes.json'), 'utf8'));
const codes = data.codes || data;
const codeMap = new Map(codes.map((c) => [Number(c.code), c]));

const categories = {
  '3xx': [
    '301-vs-302','301-vs-307','301-vs-308','302-vs-303','302-vs-307','303-vs-307','303-vs-308','307-vs-308','300-vs-301','300-vs-302','304-vs-200','304-vs-204'
  ],
  '4xx': [
    '400-vs-403','400-vs-404','400-vs-409','400-vs-422','400-vs-431','401-vs-403','401-vs-404','401-vs-407','403-vs-404','403-vs-405','404-vs-410','404-vs-451','405-vs-501','406-vs-415','408-vs-504','409-vs-412','409-vs-422','410-vs-301','411-vs-413','412-vs-428','413-vs-414','413-vs-431','415-vs-422','421-vs-503','422-vs-424','425-vs-429','426-vs-505','428-vs-412','429-vs-503','451-vs-403'
  ],
  '5xx': [
    '500-vs-502','500-vs-503','500-vs-504','501-vs-405','502-vs-503','502-vs-504','503-vs-504','503-vs-429','507-vs-413','508-vs-500','510-vs-501','511-vs-401'
  ],
  '2xx / flow': [
    '200-vs-201','200-vs-204','201-vs-202','202-vs-200','202-vs-204','204-vs-205','206-vs-200','206-vs-304','207-vs-200','208-vs-207','226-vs-200'
  ],
  '1xx': ['100-vs-102','100-vs-103','102-vs-202','103-vs-200']
};

const pairs = Object.values(categories).flat();
const pairSet = new Set(pairs);

const header = `<header class="site-header">
  <div class="container header-inner">
    <a class="header-logo" href="/" aria-label="ErrorLookup homepage">
      <img src="/assets/logo.png" alt="ErrorLookup logo" width="180" height="44">
    </a>

    <nav class="primary-nav" aria-label="Primary">
      <ul class="nav-list">
        <li><a href="/status-codes/">Status Codes</a></li>
        <li><a href="/common/client-errors/">Client Errors</a></li>
        <li><a href="/common/server-errors/">Server Errors</a></li>
        <li><a href="/common/redirect-codes/">Redirects</a></li>
        <li><a href="/compare/301-vs-302/">Comparisons</a></li>
      </ul>
    </nav>

    <div class="header-actions">
      <a class="fuel-link" href="https://onlinedevtools.app/infrastructure" rel="noopener noreferrer">Fuel The Infrastructure</a>
      <button id="theme-toggle" class="btn-ghost" type="button" aria-label="Toggle dark mode">🌓</button>
    </div>
  </div>
</header>`;

const footer = `<footer class="site-footer">
  <div class="container footer-main">
    <div class="footer-logo">
      <img src="/assets/logo.png" alt="ErrorLookup logo">
    </div>

    <p class="footer-copy">© 2026 errorlookup.com</p>
    <ul class="footer-meta-links" aria-label="Footer">
      <li><a href="/status-codes/">Status Codes</a></li>
      <li><a href="/about/">About</a></li>
      <li><a href="/privacy/">Privacy</a></li>
      <li><a href="/contact/">Contact</a></li>
      <li><a href="/terms/">Terms</a></li>
    </ul>
  </div>
  <p class="footer-signature" aria-hidden="true">// Beware of The Old Soldier</p>
</footer>`;

function esc(s){return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

function comparisonNeighbors(slug,a,b){
  const direct = [];
  for (const x of [a,b]) {
    for (const p of pairSet) if (p !== slug && (p.startsWith(`${x}-vs-`) || p.endsWith(`-vs-${x}`))) direct.push(p);
  }
  return [...new Set(direct)].slice(0,5);
}

function metaDescription(a, b, left, right) {
  return `Compare HTTP ${a} (${left.phrase}) vs ${b} (${right.phrase}): semantics, caching behavior, SEO implications, API impact, and implementation mistakes to avoid.`;
}

function tableRow(label, left, right) {return `<tr><td>${label}</td><td>${left}</td><td>${right}</td></tr>`;}

function faqJson(faqs){
  return `<script type="application/ld+json">${JSON.stringify({
    '@context':'https://schema.org', '@type':'FAQPage',
    mainEntity: faqs.map((f)=>({'@type':'Question',name:f.q,acceptedAnswer:{'@type':'Answer',text:f.a}}))
  })}</script>`;
}

function breadcrumbJson(name,url){
  return `<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:`${DOMAIN}/`},{'@type':'ListItem',position:2,name:'Compare',item:`${DOMAIN}/compare/`},{'@type':'ListItem',position:3,name,item:`${DOMAIN}${url}`}]})}</script>`;
}

function renderPage(slug) {
  const [a,b] = slug.split('-vs-').map(Number);
  const left = codeMap.get(a);
  const right = codeMap.get(b);
  if (!left || !right) throw new Error(`Missing code for ${slug}`);
  const title = `${a} vs ${b} – ${left.phrase} vs ${right.phrase}`;
  const desc = metaDescription(a,b,left,right);
  const canonical = `/compare/${slug}/`;
  const intro = `${a} and ${b} can look similar in logs, but they tell clients, crawlers, and API consumers different things.`;
  const when = `Use ${a} when the response should communicate ${left.phrase.toLowerCase()} behavior; use ${b} when ${right.phrase.toLowerCase()} is the accurate protocol signal.`;
  const mistakes = `A frequent mistake is swapping ${a} and ${b} for convenience; that causes client retry bugs, incorrect cache signals, and misleading monitoring data.`;
  const faqs = [
    { q: `What is the biggest difference between ${a} and ${b}?`, a: `${a} communicates ${left.phrase}, while ${b} communicates ${right.phrase}. Choosing the right one keeps clients and intermediaries predictable.`},
    { q: `Do ${a} and ${b} have SEO or caching impact?`, a: `Yes. Search engines and caches interpret status classes differently. Use each code according to its semantics to avoid accidental indexing, stale responses, or crawl inefficiency.`},
    { q: `Can APIs safely return ${a} instead of ${b}?`, a: `Only when it matches contract semantics. API clients often branch logic by exact code, so swapping them can break retries, auth handling, or user-facing errors.`}
  ];

  const relatedComparisons = comparisonNeighbors(slug,a,b)
    .map((s)=>`<li><a href="/compare/${s}/">${s.replace(/-/g,' ')}</a></li>`).join('');
  const relatedBlock = relatedComparisons ? `<ul>${relatedComparisons}</ul>` : '<p><a href="/compare/">Browse all comparisons</a></p>';

  const content = `<!doctype html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7167291111213614" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-75H3P692GN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);} 
  gtag('js', new Date());
  gtag('config', 'G-75H3P692GN');
</script>
<meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(title)} | ErrorLookup</title>
  <meta name="description" content="${esc(desc)}">
  <link rel="canonical" href="${DOMAIN}${canonical}">
  <meta property="og:title" content="${esc(title)} | ErrorLookup">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${DOMAIN}${canonical}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${esc(title)} | ErrorLookup">
  <meta name="twitter:description" content="${esc(desc)}">
${breadcrumbJson(`${a} vs ${b}`, canonical)}
${faqJson(faqs)}
  <link rel="stylesheet" href="/assets/css/site.css">
  <script defer src="/assets/js/theme.js"></script>
  <script defer src="/assets/js/site.js"></script>
  <script defer src="/assets/js/search.js"></script>
</head>
<body>
  ${header}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav>
    <h1>${a} vs ${b}: ${esc(left.phrase)} vs ${esc(right.phrase)}</h1>
    <p>${esc(intro)}</p>
    <div class="table-wrap"><table><thead><tr><th>Aspect</th><th>${a}</th><th>${b}</th></tr></thead><tbody>
      ${tableRow('Meaning', left.meaning, right.meaning)}
      ${tableRow('Typical use case', left.summary, right.summary)}
      ${tableRow('Caching/client behavior', `Check cache headers and downstream behavior for ${a}.`, `Check cache headers and downstream behavior for ${b}.`)}
      ${tableRow('SEO implications', `Search crawlers interpret ${a} according to ${left.class} semantics.`, `Search crawlers interpret ${b} according to ${right.class} semantics.`)}
      ${tableRow('API/backend impact', `API clients may branch logic specifically on ${a}.`, `API clients may branch logic specifically on ${b}.`)}
    </tbody></table></div>
    <section class="card"><h2>When to use one vs the other</h2><p>${esc(when)}</p><p>${esc(mistakes)}</p><p>Decision summary: if user agents should receive the ${esc(left.phrase)} signal, return ${a}; if they should receive ${esc(right.phrase)}, return ${b}.</p></section>
    <section class="card"><h2>FAQ</h2>
      ${faqs.map((f)=>`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}
    </section>
    <p>Related guides: <a href="${left.pathGuide}">${a} ${esc(left.phrase)}</a> · <a href="${right.pathGuide}">${b} ${esc(right.phrase)}</a></p>
    <section class="card"><h2>Related comparisons</h2>${relatedBlock}</section>
  </main>
  ${footer}
</body>
</html>\n`;

  const out = path.join(ROOT, 'compare', slug, 'index.html');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, content);
}

for (const slug of pairs) renderPage(slug);

const categoryBlocks = Object.entries(categories).map(([cat, items]) => {
  return `<section class="card"><h2>${cat} comparisons</h2><ul>${items.map((slug)=>`<li><a href="/compare/${slug}/">${slug.replace(/-/g, ' ')}</a></li>`).join('')}</ul></section>`;
}).join('\n    ');

const indexFaq = [
  { q: 'How should I use these HTTP comparison guides?', a: 'Start with the pair that matches your implementation decision, then confirm cache, SEO, and API implications before shipping.' },
  { q: 'Are these pages only for SEO decisions?', a: 'No. They are built for server routing, API design, observability, and client behavior decisions too.' }
];

const indexHtml = `<!doctype html>
<html lang="en">
<head>
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7167291111213614" crossorigin="anonymous"></script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-75H3P692GN"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);} 
  gtag('js', new Date());
  gtag('config', 'G-75H3P692GN');
</script>
<meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>HTTP Status Code Comparisons Index | ErrorLookup</title>
  <meta name="description" content="Browse all ErrorLookup HTTP status code comparisons by class, including redirects, client errors, server errors, success flows, and informational codes.">
  <link rel="canonical" href="${DOMAIN}/compare/">
  <meta property="og:title" content="HTTP Status Code Comparisons Index | ErrorLookup">
  <meta property="og:description" content="Browse all ErrorLookup HTTP status code comparisons by class.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="${DOMAIN}/compare/">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="HTTP Status Code Comparisons Index | ErrorLookup">
  <meta name="twitter:description" content="Browse all ErrorLookup HTTP status code comparisons by class.">
${breadcrumbJson('Compare', '/compare/')}
${faqJson(indexFaq)}
  <link rel="stylesheet" href="/assets/css/site.css">
  <script defer src="/assets/js/theme.js"></script>
  <script defer src="/assets/js/site.js"></script>
  <script defer src="/assets/js/search.js"></script>
</head>
<body>
  ${header}
  <main class="container"><nav class="breadcrumbs" data-breadcrumbs></nav>
    <h1>HTTP Status Code Comparisons</h1>
    <p>Use this index to jump to side-by-side HTTP code comparisons for redirects, client errors, server responses, and protocol flow choices.</p>
    ${categoryBlocks}
    <section class="card"><h2>FAQ</h2>${indexFaq.map((f)=>`<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join('')}</section>
  </main>
  ${footer}
</body>
</html>\n`;

fs.writeFileSync(path.join(ROOT, 'compare', 'index.html'), indexHtml);

console.log(`Generated ${pairs.length} comparison pages and compare/index.html`);
