const fs=require('fs');
const req=['code','slug','pathGuide','pathStatus','title','phrase','category','class','summary','meaning','causes','fixes','examples','related','aliases','keywords','compare','indexable','official','notes','rfc','iana_name'];
const codes=JSON.parse(fs.readFileSync('data/codes.json','utf8'));
let ok=true;
for(const c of codes){for(const k of req){if(!(k in c)){console.error(`Missing ${k} for ${c.code}`);ok=false;}} if(!Array.isArray(c.causes)||!Array.isArray(c.fixes)) {ok=false;console.error(`Invalid arrays for ${c.code}`);} }
if(ok) console.log(`Validated ${codes.length} codes`); process.exit(ok?0:1);
