async function initSearch() {
  const form = document.getElementById('lookup-search');
  if (!form) return;

  const input = document.getElementById('lookup-input');
  const list = document.getElementById('search-suggestions');
  const raw = await fetch('/data/codes.json').then((r) => r.json());
  const codes = raw.codes || [];

  const quickRoutes = [
    [/^404$|not found/, '/guides/404-not-found/'],
    [/^500$|internal server/, '/guides/500-internal-server-error/'],
    [/cloudflare\s*522|\b522\b.*cloudflare/, '/guides/cloudflare-522/'],
    [/cloudflare\s*520|\b520\b.*cloudflare/, '/guides/cloudflare-520/'],
    [/cloudflare\s*524|\b524\b.*cloudflare/, '/guides/cloudflare-524/'],
    [/nginx\s*499|\b499\b.*nginx/, '/guides/nginx-499/'],
    [/nginx\s*444|\b444\b.*nginx/, '/guides/nginx-444/'],
    [/err_connection_refused|connection refused/, '/guides/net-err-connection-refused/'],
    [/err_cert_common_name_invalid|common name invalid/, '/guides/net-err-cert-common-name-invalid/']
  ];

  const norm = (v) => String(v || '').toLowerCase().trim();
  const routeFromTerm = (term) => {
    for (const [pattern, route] of quickRoutes) {
      if (pattern.test(term)) return route;
    }
    return null;
  };

  let results = [];
  let active = -1;

  const scoreResult = (item, term) => {
    let s = 0;
    if (String(item.code) === term) s += 200;
    const haystack = [item.title, item.phrase, item.category, item.class, ...(item.aliases || []), ...(item.keywords || [])].join(' ').toLowerCase();
    if (haystack.includes(term)) s += 40;
    return s;
  };

  const render = () => {
    list.innerHTML = results.map((r, i) => `<li role="option" aria-selected="${i === active}" data-url="${r.url}"><strong>${r.label}</strong> <span class="muted">${r.hint}</span></li>`).join('');
  };

  input.addEventListener('input', () => {
    const term = norm(input.value);
    if (!term) { results = []; list.innerHTML = ''; return; }

    const quick = routeFromTerm(term);
    results = quick ? [{ label: 'Direct guide', hint: quick, url: quick }] : [];

    const topCodes = codes.map((c) => ({ ...c, _score: scoreResult(c, term) }))
      .filter((c) => c._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 6)
      .map((c) => ({ label: `${c.code} ${c.phrase}`, hint: 'HTTP guide', url: c.pathGuide || c.pathStatus }));

    results = [...results, ...topCodes];
    active = -1;
    render();
  });

  input.addEventListener('keydown', (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % results.length; render(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + results.length) % results.length; render(); }
    if (e.key === 'Enter') { e.preventDefault(); location.href = (results[active] || results[0]).url; }
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-url]');
    if (li) location.href = li.dataset.url;
  });

  form.addEventListener('submit', (e) => {
    const term = norm(input.value);
    const quick = routeFromTerm(term);
    if (quick) { e.preventDefault(); location.href = quick; }
  });
}

document.addEventListener('DOMContentLoaded', initSearch);
