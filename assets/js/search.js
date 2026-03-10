async function initSearch(){
  const form=document.getElementById('lookup-search'); if(!form)return;
  const input=document.getElementById('lookup-input'); const list=document.getElementById('search-suggestions');
  const codes=await fetch('/data/codes.json').then(r=>r.json());
  let active=-1,results=[];
  const q=(s)=>s.toLowerCase().trim();
  const score=(item,term)=>{
    let s=0; if(String(item.code)===term) s+=100;
    const hay=[item.title,item.phrase,item.category,...(item.aliases||[]),...(item.keywords||[])].join(' ').toLowerCase();
    if(hay.includes(term)) s+=20;
    if(term.includes('redirect') && item.class===3) s+=25;
    if((term.includes('auth')||term.includes('forbid')) && [401,403,407,511].includes(item.code)) s+=25;
    return s;
  }
  const render=()=>{list.innerHTML=results.map((r,i)=>`<li role="option" aria-selected="${i===active}" data-url="${r.pathStatus}"><strong>${r.code}</strong> ${r.title} <span class="muted">${r.pathGuide}</span></li>`).join('');};
  input.addEventListener('input',()=>{const term=q(input.value); if(!term){list.innerHTML='';return;} results=codes.map(c=>({...c,_s:score(c,term)})).filter(c=>c._s>0).sort((a,b)=>b._s-a._s).slice(0,8); active=-1; render();});
  input.addEventListener('keydown',(e)=>{if(!results.length)return; if(e.key==='ArrowDown'){active=(active+1)%results.length;render();e.preventDefault();}
    if(e.key==='ArrowUp'){active=(active-1+results.length)%results.length;render();e.preventDefault();}
    if(e.key==='Enter'){e.preventDefault(); location.href=(results[active]||results[0]).pathStatus;}});
  list.addEventListener('click',e=>{const li=e.target.closest('li[data-url]'); if(li) location.href=li.dataset.url;});
}
document.addEventListener('DOMContentLoaded',initSearch);
