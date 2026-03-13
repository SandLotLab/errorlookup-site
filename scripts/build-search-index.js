const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GUIDES = path.join(ROOT, 'guides');
const outPath = path.join(ROOT, 'data', 'search-index.json');

const STOP = new Set(['the','and','for','with','that','from','this','into','when','your','have','are','not','can','you','out','but','was','its','http','error']);

function textBetween(html, heading){
  const re = new RegExp(`<h2>${heading}<\\/h2>([\\s\\S]*?)<\\/section>`, 'i');
  const m = html.match(re);
  if(!m) return '';
  return m[1].replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
}
function words(text){
  return [...new Set((text.toLowerCase().match(/[a-z0-9_]{4,}/g)||[]).filter((w)=>!STOP.has(w)))];
}
function groupFor(slug, title){
  if (slug.startsWith('cloudflare-')) return 'Cloudflare';
  if (slug.startsWith('nginx-')) return 'Nginx';
  if (slug.startsWith('net-err-') || slug.startsWith('ssl-')) return 'Browser/Network';
  const n = title.match(/\b(\d{3})\b/);
  if (n) return `HTTP ${n[1][0]}xx`;
  return 'General';
}

const entries=[];
for (const slug of fs.readdirSync(GUIDES)) {
  const fp=path.join(GUIDES, slug, 'index.html');
  if(!fs.existsSync(fp)) continue;
  const html=fs.readFileSync(fp,'utf8');
  const h1=(html.match(/<h1>([^<]+)<\/h1>/i)||[])[1];
  if(!h1) continue;
  const plain=textBetween(html,'Plain-English meaning');
  const causes=textBetween(html,'Common causes');
  const code=(h1.match(/\b(\d{3})\b/)||[])[1]||'';
  const signal=(h1.match(/ERR_[A-Z_]+/i)||[])[0]||'';
  const symptomKeywords=words(`${plain} ${causes}`).slice(0, 14);

  entries.push({
    label: h1,
    code: code || signal,
    url: `/guides/${slug}/`,
    hint: 'Guide',
    group: groupFor(slug, h1),
    searchText: `${h1.toLowerCase()} ${plain.toLowerCase()} ${causes.toLowerCase()} ${(signal||'').toLowerCase()} ${symptomKeywords.join(' ')}`
  });
}

fs.writeFileSync(outPath, JSON.stringify({ entries }, null, 2) + '\n');
console.log(`Wrote ${entries.length} entries to ${outPath}`);
