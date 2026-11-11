/**
 * Lists Arabic UI strings in the source that have no English entry in lib/i18n/en.json.
 * Run: node scripts/i18n/find-missing.cjs
 */
const fs = require('fs'), path = require('path');
const ts = require('typescript');

const root = path.resolve(__dirname, '../..');
const AR = /[؀-ۿ]/;
const files = [];
function walk(d){ for (const f of fs.readdirSync(d)) { const p = path.join(d,f); const st = fs.statSync(p);
  if (st.isDirectory()) walk(p); else if (/\.(tsx?|jsx?)$/.test(f)) files.push(p); } }
for (const d of ['app','components','lib','hooks']) if (fs.existsSync(path.join(root,d))) walk(path.join(root,d));
const norm = s => s.replace(/\s+/g,' ').trim();
const out = new Map();
function add(k, file){ k = norm(k); if (!k || !AR.test(k)) return; if(!out.has(k)) out.set(k, new Set()); out.get(k).add(path.relative(root,file)); }
for (const file of files) {
  if (file.includes('/lib/i18n/') || file.includes('/components/i18n/')) continue;
  const src = fs.readFileSync(file,'utf8'); if (!AR.test(src)) continue;
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
  const inConsole = n => { for (let p=n.parent; p; p=p.parent) { if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText(sf))) return true; } return false; };
  (function visit(n){
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) { if (!inConsole(n)) add(n.text, file); }
    else if (ts.isJsxText(n)) add(n.text, file);
    else if (ts.isTemplateExpression(n)) {
      if (!inConsole(n)) { let k = n.head.text; n.templateSpans.forEach((s,i)=>{ k += `{${i}}` + s.literal.text; }); add(k, file);
        // also static parts separately, in case of nested ternaries
      }
    }
    ts.forEachChild(n, visit);
  })(sf);
}
const dict = require(path.join(root, 'lib/i18n/en.json'));
const missing = [...out.keys()].filter((k) => !(k in dict)).sort();
if (!missing.length) { console.log('All Arabic UI strings have an English translation.'); process.exit(0); }
console.log(`${missing.length} Arabic string(s) missing from lib/i18n/en.json:\n`);
for (const k of missing) console.log(JSON.stringify(k), '  <-', [...out.get(k)].join(', '));
process.exitCode = 1;
