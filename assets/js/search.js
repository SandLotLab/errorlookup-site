(function () {
  const SEARCH_INDEX_PATH = '/data/search-index.json';
  const CODES_PATH = '/data/codes.json';
  const RECENT_KEY = 'errorlookup_recent_searches_v1';

  const TYPO_FIXES = {
    ngnix: 'nginx',
    clodflare: 'cloudflare',
    connexion: 'connection',
    forbiden: 'forbidden',
    unauthorised: 'unauthorized'
  };

  const STATIC_SYMPTOMS = {
    timeout: ['504', '522', '524', '408'],
    refused: ['ERR_CONNECTION_REFUSED', '502'],
    'not found': ['404', '410'],
    auth: ['401', '403'],
    'too many': ['429'],
    redirect: ['301', '302', '307', '308'],
    forbidden: ['403'],
    crashed: ['500', '502', '503']
  };

  function normalize(value) {
    let out = String(value || '').toLowerCase().trim();
    out = out.replace(/[’']/g, '').replace(/[_-]+/g, ' ');
    Object.entries(TYPO_FIXES).forEach(([bad, good]) => {
      out = out.replace(new RegExp(`\\b${bad}\\b`, 'g'), good);
    });
    return out.replace(/\s+/g, ' ');
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j += 1) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i += 1) {
      for (let j = 1; j <= a.length; j += 1) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[b.length][a.length];
  }

  function buildModal() {
    if (document.getElementById('search-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'search-modal';
    modal.className = 'search-modal';
    modal.setAttribute('hidden', 'hidden');
    modal.innerHTML = `
      <div class="search-modal__backdrop" data-close-search="true"></div>
      <div class="search-modal__panel" role="dialog" aria-modal="true" aria-label="Search error guides">
        <div class="search-modal__top">
          <input id="lookup-input" type="search" placeholder="Search errors, symptoms, platforms..." autocomplete="off" />
          <button type="button" class="btn-ghost" id="search-close" aria-label="Close search">Esc</button>
        </div>
        <div class="search-modal__meta">
          <span id="search-context-label" class="muted"></span>
          <button type="button" id="clear-recent-searches" class="link-btn" hidden>Clear recent</button>
        </div>
        <div id="search-did-you-mean" class="muted" hidden></div>
        <ul id="search-suggestions" class="suggestions" role="listbox" aria-label="Search suggestions"></ul>
      </div>`;
    document.body.appendChild(modal);
  }

  function ensureTriggers() {
    document.querySelectorAll('.header-actions').forEach((actions) => {
      if (actions.querySelector('[data-search-open]')) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn-ghost search-trigger';
      button.dataset.searchOpen = 'header';
      button.textContent = 'Search errors... Ctrl+K';
      actions.prepend(button);
    });

    const heroForm = document.getElementById('lookup-search');
    if (heroForm && !heroForm.dataset.unifiedSearch) {
      heroForm.dataset.unifiedSearch = 'true';
      heroForm.innerHTML = `<label for="hero-search-trigger">Search error guides</label>
      <button id="hero-search-trigger" class="hero-search-trigger" type="button" data-search-open="hero">Try: 404, cloudflare 522, nginx 499, connection refused</button>
      <p id="search-help" class="muted">Press / or Ctrl+K to open search.</p>`;
    }
  }

  function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
  }

  function saveRecent(query, result) {
    if (!query || !result) return;
    const next = [{ query, label: result.label, url: result.url }, ...getRecent().filter((r) => r.query !== query)].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }

  function clearRecent() { localStorage.removeItem(RECENT_KEY); }

  function init() {
    if (window.__errorLookupSearchInited) return;
    window.__errorLookupSearchInited = true;

    buildModal();
    ensureTriggers();

    const modal = document.getElementById('search-modal');
    const input = document.getElementById('lookup-input');
    const list = document.getElementById('search-suggestions');
    const didYouMean = document.getElementById('search-did-you-mean');
    const contextLabel = document.getElementById('search-context-label');
    const clearRecentBtn = document.getElementById('clear-recent-searches');

    let entries = [];
    let vocabulary = [];
    let results = [];
    let active = -1;

    function closeModal() {
      modal.setAttribute('hidden', 'hidden');
      input.value = '';
      results = [];
      list.innerHTML = '';
      didYouMean.hidden = true;
    }

    function openModal() {
      modal.removeAttribute('hidden');
      input.focus();
      renderForTerm('');
    }

    function renderGrouped() {
      const grouped = new Map();
      results.forEach((r) => {
        if (!grouped.has(r.group)) grouped.set(r.group, []);
        grouped.get(r.group).push(r);
      });
      let idx = 0;
      list.innerHTML = [...grouped.entries()].map(([group, groupItems]) => {
        const body = groupItems.map((r) => {
          const row = `<li role="option" aria-selected="${idx === active}" data-index="${idx}" data-url="${r.url}"><strong>${r.label}</strong> <span class="muted">${r.hint || r.group}</span></li>`;
          idx += 1;
          return row;
        }).join('');
        return `<li class="search-group">${group}</li>${body}`;
      }).join('');
    }

    function fuzzySuggestion(term) {
      if (!term || term.length < 4) return '';
      let best = null;
      vocabulary.forEach((word) => {
        const dist = levenshtein(term, word);
        if (dist <= 2 && (!best || dist < best.dist)) best = { word, dist };
      });
      return best ? best.word : '';
    }

    function score(entry, term, tokens, symptomHits) {
      let s = 0;
      const bag = `${entry.label} ${entry.searchText}`;
      if (entry.code && entry.code === term) s += 260;
      if (entry.code && /^\d+$/.test(term) && entry.code.startsWith(term)) s += 120;
      if (bag.includes(term)) s += 35;
      tokens.forEach((token) => {
        if (bag.includes(token)) s += 14;
      });
      symptomHits.forEach((hit) => {
        if ((entry.code && entry.code === hit) || entry.label.toLowerCase().includes(hit.toLowerCase())) s += 95;
      });
      return s;
    }

    function renderForTerm(rawTerm) {
      const term = normalize(rawTerm);
      active = -1;
      if (!term) {
        const recent = getRecent();
        contextLabel.textContent = recent.length ? 'Recent' : 'Start typing to find an error guide';
        clearRecentBtn.hidden = !recent.length;
        results = recent.map((r) => ({ ...r, group: 'Recent', hint: 'recent search' }));
        renderGrouped();
        return;
      }

      const symptomHits = Object.entries(STATIC_SYMPTOMS)
        .filter(([k]) => term.includes(k))
        .flatMap(([, ids]) => ids);

      const tokens = term.split(' ').filter(Boolean);
      results = entries
        .map((entry) => ({ ...entry, _score: score(entry, term, tokens, symptomHits) }))
        .filter((entry) => entry._score > 0)
        .sort((a, b) => b._score - a._score)
        .slice(0, 12);

      contextLabel.textContent = `${results.length} results`;
      clearRecentBtn.hidden = true;
      renderGrouped();

      const fuzzy = fuzzySuggestion(term);
      if (fuzzy && fuzzy !== term) {
        didYouMean.hidden = false;
        didYouMean.innerHTML = `Did you mean <button class="link-btn" type="button" id="did-you-mean-btn">${fuzzy}</button>?`;
        const btn = document.getElementById('did-you-mean-btn');
        if (btn) btn.onclick = () => { input.value = fuzzy; renderForTerm(fuzzy); };
      } else {
        didYouMean.hidden = true;
      }
    }

    function goToResult(result) {
      if (!result) return;
      saveRecent(normalize(input.value), result);
      location.href = result.url;
    }

    Promise.all([
      fetch(CODES_PATH).then((r) => r.json()).catch(() => ({ codes: [] })),
      fetch(SEARCH_INDEX_PATH).then((r) => r.json()).catch(() => ({ entries: [] }))
    ]).then(([codesData, searchData]) => {
      const codeEntries = (codesData.codes || []).map((c) => ({
        label: `${c.code} ${c.phrase}`,
        code: String(c.code),
        url: c.pathGuide || c.pathStatus,
        hint: c.title,
        group: c.category === '4xx' ? 'HTTP 4xx' : c.category === '5xx' ? 'HTTP 5xx' : `HTTP ${c.category}`,
        searchText: normalize([c.title, c.phrase, c.category, c.class, ...(c.aliases || []), ...(c.keywords || [])].join(' '))
      }));
      entries = [...(searchData.entries || []), ...codeEntries]
        .filter((v, i, arr) => arr.findIndex((x) => x.url === v.url) === i);
      vocabulary = [...new Set(entries.flatMap((e) => normalize(`${e.label} ${e.searchText}`).split(/\s+/).filter((w) => w.length > 3)))];
    });

    document.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-search-open]');
      if (opener) {
        e.preventDefault();
        openModal();
      }
      if (e.target.closest('[data-close-search]') || e.target.id === 'search-close') closeModal();
      if (e.target.id === 'clear-recent-searches') {
        clearRecent();
        renderForTerm('');
      }

      const li = e.target.closest('li[data-index]');
      if (li) goToResult(results[Number(li.dataset.index)]);
    });

    input.addEventListener('input', () => renderForTerm(input.value));

    input.addEventListener('keydown', (e) => {
      const selectable = results.length;
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (e.key === 'ArrowDown' && selectable) { e.preventDefault(); active = (active + 1) % selectable; renderGrouped(); }
      if (e.key === 'ArrowUp' && selectable) { e.preventDefault(); active = (active - 1 + selectable) % selectable; renderGrouped(); }
      if (e.key === 'Enter' && selectable) { e.preventDefault(); goToResult(results[active >= 0 ? active : 0]); }
    });

    document.addEventListener('keydown', (e) => {
      const isTyping = ['INPUT', 'TEXTAREA'].includes((e.target && e.target.tagName) || '') || e.target?.isContentEditable;
      const slash = e.key === '/';
      const command = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k';
      if (command || (slash && !isTyping)) {
        e.preventDefault();
        openModal();
      } else if (e.key === 'Escape' && !modal.hasAttribute('hidden')) {
        closeModal();
      }
    });
  }

  window.ErrorLookupSearch = { init };
})();
