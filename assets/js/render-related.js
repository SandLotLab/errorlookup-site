async function renderRelated() {
  const root = document.querySelector('[data-related-code]');
  const mount = document.getElementById('related-links');
  if (!root || !mount) return;

  const code = Number(root.dataset.relatedCode);
  const raw = await fetch('/data/codes.json').then((r) => r.json());
  const codes = raw.codes || [];
  const current = codes.find((c) => c.code === code);
  if (!current) return;

  const related = (current.related || []).map((n) => codes.find((c) => c.code === n)).filter(Boolean);

  mount.innerHTML = related.length
    ? `<ul>${related.map((r) => `<li><a href="${r.pathStatus}">HTTP ${r.code}</a> · <a href="${r.pathGuide}">${r.phrase}</a></li>`).join('')}</ul>`
    : '<p class="muted">No direct related codes are listed for this status. Browse the <a href="/status-codes/">full status hub</a>.</p>';
}

document.addEventListener('DOMContentLoaded', renderRelated);
