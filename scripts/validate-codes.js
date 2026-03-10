const fs = require('fs');

const required = ['code','slug','pathGuide','pathStatus','title','phrase','iana_name','category','class','summary','meaning','causes','fixes','examples','related','aliases','keywords','compare','faq','indexable','official','notes','rfc','status'];
const raw = JSON.parse(fs.readFileSync('data/codes.json', 'utf8'));
const codes = raw.codes || [];

if (!raw.site || !raw.site.name || !raw.site.domain) {
  console.error('Missing site object metadata');
  process.exit(1);
}

let ok = true;
for (const c of codes) {
  for (const key of required) {
    if (!(key in c)) {
      console.error(`Missing ${key} for code ${c.code}`);
      ok = false;
    }
  }
  if (!Array.isArray(c.causes) || !Array.isArray(c.fixes) || !Array.isArray(c.faq)) {
    console.error(`Invalid array fields for code ${c.code}`);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log(`Validated ${codes.length} codes with site metadata`);
