// すべての JS の構文チェック（node --check）と、アイテム id の重複チェック
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.js') || p.endsWith('.mjs')) files.push(p); } };
walk('src'); walk('tools');
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' }); } catch (e) { bad++; console.log(`✗ ${f}\n${e.stderr}`); }
}
const items = readFileSync('src/data/items.js', 'utf8').match(/^ {2}([A-Za-z0-9_]+): \{/gm).map((s) => s.trim().split(':')[0]);
const dup = items.filter((k, i) => items.indexOf(k) !== i);
if (dup.length) { bad++; console.log('✗ アイテム id が重複:', dup.join(', ')); }
console.log(bad ? `NG（${bad}件）` : `OK：${files.length} ファイル、アイテム ${items.length} 種`);
process.exit(bad ? 1 : 0);
