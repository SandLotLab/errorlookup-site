async function initSearch() {
  const form = document.getElementById('lookup-search');
  if (!form) return;

  const input = document.getElementById('lookup-input');
  const list = document.getElementById('search-suggestions');
  const raw = await fetch('/data/codes.json').then((r) => r.json());
  const codes = raw.codes || [];

  let active = -1;
  let results = [];

  const norm = (v) => String(v || '').toLowerCase().trim();

  const scoreResult = (item, term) => {
    let s = 0;
    if (String(item.code) === term) s += 200;
    const haystack = [item.title, item.phrase, item.category, item.class, ...(item.aliases || []), ...(item.keywords || [])].join(' ').toLowerCase();
    if (haystack.includes(term)) s += 40;
    if (term.includes('redirect') && item.class === 'redirect-codes') s += 50;
    if ((term.includes('auth') || term.includes('forbid')) && [401, 403, 407, 511].includes(item.code)) s += 50;
    return s;
  };

  const render = () => {
    list.innerHTML = results.map((r, i) => `
      <li role="option" aria-selected="${i === active}" data-status="${r.pathStatus}" data-guide="${r.pathGuide}">
        <strong>${r.code}</strong> ${r.phrase}
        <span class="muted">${r.class}</span>
      </li>`).join('');
  };

  input.addEventListener('input', () => {
    const term = norm(input.value);
    if (!term) {
      results = [];
      list.innerHTML = '';
      return;
    }

    results = codes
      .map((c) => ({ ...c, _score: scoreResult(c, term) }))
      .filter((c) => c._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 8);

    active = -1;
    render();
  });

  input.addEventListener('keydown', (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = (active + 1) % results.length;
      render();
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = (active - 1 + results.length) % results.length;
      render();
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const pick = results[active] || results[0];
      location.href = pick.pathStatus;
    }
  });

  list.addEventListener('click', (e) => {
    const li = e.target.closest('li[data-status]');
    if (li) location.href = li.dataset.status;
  });
}

document.addEventListener('DOMContentLoaded', initSearch);
