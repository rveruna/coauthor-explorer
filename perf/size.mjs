// Fails when the production bundle grows past its budget. Run after `npm run build`.
// Usage: node perf/size.mjs
// The budget applies to what the page loads up front: the files index.html refers to. Everything else is loaded later,
// only when needed (the saved copies of researchers' data when OpenAlex cannot be reached, and the avatar maker once a
// network is shown), and is reported but not counted against the budget.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Budgets in kilobytes of gzipped output, with headroom over today's size.
const BUDGETS = { '.js': 130, '.css': 3 };

const dist = new URL('../dist/', import.meta.url);
const assets = new URL('assets/', dist);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const initial = new Set([...html.matchAll(/assets\/([^"']+\.(?:js|css))/g)].map((m) => m[1]));
const gzipKb = (files) =>
  files.reduce((sum, f) => sum + gzipSync(readFileSync(new URL(f, assets))).length, 0) / 1000;

let failed = false;
for (const [ext, budget] of Object.entries(BUDGETS)) {
  const kb = gzipKb([...initial].filter((f) => f.endsWith(ext)));
  const ok = kb <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${ext.slice(1).toUpperCase().padEnd(3)} ${kb.toFixed(1)} kB gzipped up front (budget ${budget} kB)`,
  );
}
const later = readdirSync(assets).filter((f) => f.endsWith('.js') && !initial.has(f));
console.log(
  `     ${later.length} files loaded later, ${gzipKb(later).toFixed(1)} kB gzipped in total, only when needed`,
);
process.exit(failed ? 1 : 0);
