const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname,'..'); const base='https://errorlookup.com';
const pages=[];
function walk(dir){for(const f of fs.readdirSync(dir)){const p=path.join(dir,f);const s=fs.statSync(p);if(s.isDirectory())walk(p);else if(f==='index.html'){pages.push('/'+path.relative(root,path.dirname(p)).replace(/\\/g,'/')+'/');}}}
walk(root);
const uniq=[...new Set(pages.map(p=>p.replace('//','/').replace('/./','/')))].sort();
const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+uniq.map(u=>`  <url><loc>${base}${u==='//'?'/':u}</loc></url>`).join('\n')+'\n</urlset>\n';
fs.writeFileSync(path.join(root,'sitemap.xml'),xml);
