// Builds the app, serves it, and runs Lighthouse several times in real Chrome. It measures the starting screen,
// which makes no request to OpenAlex, so the numbers describe the app and not the API's speed.
// Usage: node perf/lighthouse.mjs [--runs 5] [--label baseline] [--min-score 90] [--min-quality 95]
// --min-score fails the run when the median performance score is lower; --min-quality does the same for the
// accessibility, best-practices and SEO scores.
// Set CHROME_PATH if Chrome is not in the default location.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';

const flag = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const runs = Number(flag('runs', 5));
const label = flag('label', 'run');
const minScore = flag('min-score', undefined);
const minQuality = flag('min-quality', undefined);
const APP = 'http://localhost:4173/';
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome');

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function waitFor(url) {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(url);
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 250));
    }
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const build = spawnSync('npm', ['run', 'build'], { stdio: 'ignore' });
if (build.status !== 0) throw new Error('build failed');

const servers = [spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { stdio: 'ignore' })];
const stop = () => servers.forEach((s) => s.kill());
process.on('exit', stop);

try {
  await waitFor(APP);

  const results = [];
  for (let i = 0; i < runs; i++) {
    const lh = spawnSync(
      'npx',
      [
        '-y',
        'lighthouse',
        APP,
        '--output=json',
        '--output-path=stdout',
        '--quiet',
        '--only-categories=performance,accessibility,best-practices,seo',
        '--chrome-flags=--headless=new --no-sandbox',
      ],
      { env: { ...process.env, CHROME_PATH: chrome }, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    if (lh.status !== 0) throw new Error(`lighthouse failed: ${lh.stderr.slice(0, 300)}`);
    const r = JSON.parse(lh.stdout);
    const a = r.audits;
    results.push({
      score: Math.round(r.categories.performance.score * 100),
      accessibility: Math.round(r.categories.accessibility.score * 100),
      bestPractices: Math.round(r.categories['best-practices'].score * 100),
      seo: Math.round(r.categories.seo.score * 100),
      fcp: a['first-contentful-paint'].numericValue,
      lcp: a['largest-contentful-paint'].numericValue,
      tbt: a['total-blocking-time'].numericValue,
      cls: a['cumulative-layout-shift'].numericValue,
      speedIndex: a['speed-index'].numericValue,
      transferKb: a['total-byte-weight'].numericValue / 1024,
      scriptKb:
        (r.audits['resource-summary'].details.items.find((x) => x.resourceType === 'script')?.transferSize ??
          0) / 1024,
    });
    process.stdout.write(
      `  run ${i + 1}/${runs}: score ${results[i].score}, LCP ${Math.round(results[i].lcp)} ms\n`,
    );
  }

  const med = Object.fromEntries(Object.keys(results[0]).map((k) => [k, median(results.map((x) => x[k]))]));
  console.log(`\nMedian of ${runs} runs (${label}), mobile emulation, simulated Slow 4G, starting screen:`);
  console.log(`  Performance score   ${med.score}`);
  console.log(`  Accessibility       ${med.accessibility}`);
  console.log(`  Best practices      ${med.bestPractices}`);
  console.log(`  SEO                 ${med.seo}`);
  console.log(`  First Contentful    ${Math.round(med.fcp)} ms`);
  console.log(`  Largest Contentful  ${Math.round(med.lcp)} ms`);
  console.log(`  Total Blocking Time ${Math.round(med.tbt)} ms`);
  console.log(`  Layout shift (CLS)  ${med.cls.toFixed(3)}`);
  console.log(`  Speed Index         ${Math.round(med.speedIndex)} ms`);
  console.log(
    `  Page weight         ${med.transferKb.toFixed(1)} kB (scripts ${med.scriptKb.toFixed(1)} kB)`,
  );

  mkdirSync(new URL('./results/', import.meta.url), { recursive: true });
  writeFileSync(
    new URL(`./results/${label}.json`, import.meta.url),
    JSON.stringify({ label, runs, median: med, all: results }, null, 2),
  );

  const weak = ['accessibility', 'bestPractices', 'seo'].filter(
    (k) => minQuality !== undefined && med[k] < Number(minQuality),
  );
  if (weak.length > 0) {
    console.error(`\n${weak.join(', ')} below the minimum of ${minQuality}.`);
    process.exitCode = 1;
  }
  if (minScore !== undefined && med.score < Number(minScore)) {
    console.error(`\nPerformance score ${med.score} is below the minimum of ${minScore}.`);
    process.exitCode = 1;
  }
} finally {
  stop();
}
