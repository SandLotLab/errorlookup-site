async function renderRelated(){
  const root=document.querySelector('[data-related-code]'); if(!root)return;
  const code=Number(root.dataset.relatedCode); const wrap=document.getElementById('related-links');
  const codes=await fetch('/data/codes.json').then(r=>r.json());
  const item=codes.find(c=>c.code===code); if(!item||!wrap)return;
  const rel=(item.related||[]).map(n=>codes.find(c=>c.code===n)).filter(Boolean);
  wrap.innerHTML=rel.length?('<ul>'+rel.map(r=>`<li><a href="${r.pathStatus}">${r.code} ${r.title}</a> · <a href="${r.pathGuide}">Guide</a></li>`).join('')+'</ul>'):'<p class="muted">Browse adjacent categories on the status code hub.</p>';
}
document.addEventListener('DOMContentLoaded',renderRelated);
