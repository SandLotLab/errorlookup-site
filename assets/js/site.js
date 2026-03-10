async function includePartials(){
  const nodes=[...document.querySelectorAll('[data-include]')];
  await Promise.all(nodes.map(async n=>{const r=await fetch(n.dataset.include);n.innerHTML=await r.text();}));
}
function setupBreadcrumbs(){
  const bc=document.querySelector('[data-breadcrumbs]'); if(!bc)return;
  const path=location.pathname.split('/').filter(Boolean);
  let cur='';
  bc.innerHTML='<a href="/">Home</a> / '+path.map((p,i)=>{cur+='/'+p; return i===path.length-1?`<span>${p.replace(/-/g,' ')}</span>`:`<a href="${cur}/">${p.replace(/-/g,' ')}</a>`}).join(' / ');
}
document.addEventListener('DOMContentLoaded', async()=>{await includePartials();setupBreadcrumbs();});
