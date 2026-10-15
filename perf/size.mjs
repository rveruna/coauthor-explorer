// Fails when the production bundle grows past its budget. Run after `npm run build`.
// Usage: node perf/size.mjs
// The saved copies of researchers' data are loaded only when OpenAlex cannot be reached, so they are reported
// but not counted against the budget for what every visitor downloads.
import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Budgets in kilobytes of gzipped output, with headroom over today's size.
const BUDGETS = { '.js': 130, '.css': 3 };
const SNAPSHOT = /^A\d+-/;

const dir = new URL('../dist/assets/', import.meta.url);
const gzipKb = (files) =>
  files.reduce((sum, f) => sum + gzipSync(readFileSync(new URL(f, dir))).length, 0) / 1000;

let failed = false;
for (const [ext, budget] of Object.entries(BUDGETS)) {
  const files = readdirSync(dir).filter((f) => f.endsWith(ext) && !SNAPSHOT.test(f));
  const kb = gzipKb(files);
  const ok = kb <= budget;
  failed ||= !ok;
  console.log(
    `${ok ? 'ok  ' : 'FAIL'} ${ext.slice(1).toUpperCase().padEnd(3)} ${kb.toFixed(1)} kB gzipped (budget ${budget} kB)`,
  );
}
const saved = readdirSync(dir).filter((f) => SNAPSHOT.test(f));
console.log(
  `     ${saved.length} saved copies, ${gzipKb(saved).toFixed(1)} kB gzipped in total, loaded only as a fallback`,
);
process.exit(failed ? 1 : 0);
