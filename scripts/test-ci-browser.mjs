import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';

const cli = 'node_modules/@playwright/test/cli.js';
const config = process.env.CI_PLAYWRIGHT_CONFIG ? [`--config=${process.env.CI_PLAYWRIGHT_CONFIG}`] : [];
const base = process.env.CI_BASE_SHA;
const plan = process.argv.includes('--plan');
const smoke = [
  'original art loads and character labels stay readable',
  'equipped weapons display their original native sprites',
  'slow loading shows only the loading screen',
  'failed assets do not enable play',
  'arsenal and field kit use native icons',
  'compact arsenal, overview and charge',
  'special tray fires shotgun, dynamite and airstrike',
];
let full = process.env.FULL_BROWSER === 'true';
let files = [], reason = full ? 'Full regression requested' : 'Affected tests plus browser smoke';
if (!full) {
  try {
    if (!base || /^0+$/.test(base)) throw new Error('No comparison revision');
    execFileSync('git', ['rev-parse', '--verify', `${base}^{commit}`], { stdio: 'pipe' });
    files = execFileSync('git', ['diff', '--name-only', '-z', base, 'HEAD'], { encoding: 'utf8' }).split('\0').filter(Boolean);
    // These changes affect the entire application or how tests are selected.
    if (files.some(file => /^(?:package(?:-lock)?\.json$|playwright.*config\.|vite.*config\.|\.github\/workflows\/|scripts\/test-ci-browser\.mjs$|src\/main\.js$|public\/|index\.html$|armageddon\.html$)/.test(file))) {
      full = true; reason = 'Application entry, assets, dependencies or CI configuration changed';
    }
  } catch {
    full = true; reason = 'Comparison revision unavailable; running full regression';
  }
}
const list = args => {
  // Discovery must return JSON on stdout. CI's artifact destination applies
  // only to the actual test run, otherwise Playwright prints a text listing.
  const env = { ...process.env };
  for (const key of ['PLAYWRIGHT_JSON_OUTPUT_NAME', 'PLAYWRIGHT_JSON_OUTPUT_FILE', 'PLAYWRIGHT_JSON_OUTPUT_DIR']) delete env[key];
  const output = execFileSync(process.execPath, [cli, 'test', ...config, '--project=desktop', '--list', '--reporter=json', '--pass-with-no-tests', ...args], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, env });
  const report = JSON.parse(output);
  if (report.errors?.length) throw new Error(JSON.stringify(report.errors));
  const specs = [];
  const visit = suite => { specs.push(...suite.specs ?? []); for (const child of suite.suites ?? []) visit(child); };
  for (const suite of report.suites ?? []) visit(suite);
  return specs;
};
const all = list([]);
for (const title of smoke) {
  if (!all.some(spec => spec.title.includes(title))) throw new Error(`Missing required browser smoke: ${title}`);
}
let selected = all;
if (!full) {
  const affected = new Set(list([`--only-changed=${base}`]).map(spec => spec.file));
  // Imports inside page.evaluate run in the browser, outside Playwright's
  // Node dependency graph. Include their files when those modules change.
  const modules = new Set(files.filter(file => file.startsWith('src/')).map(file => `/${file}`));
  for (const file of readdirSync('tests').filter(file => file.endsWith('.spec.js'))) {
    const source = readFileSync(`tests/${file}`, 'utf8');
    if ([...source.matchAll(/import\(\s*["']([^"']+)["']/g)].some(match => modules.has(match[1]))) affected.add(file);
  }
  selected = all.filter(spec => affected.has(spec.file) || smoke.some(title => spec.title.includes(title)));
}
console.log(`${reason}: ${selected.length}/${all.length} browser tests selected. Native logic still runs in full.`);
if (plan) {
  console.log(JSON.stringify({ full, reason, changed: files, tests: selected.map(spec => `${spec.file}: ${spec.title}`) }, null, 2));
  process.exit(0);
}
const args = ['test', ...config, '--project=desktop', '--fully-parallel', '--workers=2', '--pass-with-no-tests'];
if (!full) {
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  args.push('--grep', selected.length ? selected.map(spec => `${escape(spec.title)}$`).join('|') : '(?!)');
}
if (process.env.CI_SHARD) args.push(`--shard=${process.env.CI_SHARD}`);
const result = spawnSync(process.execPath, [cli, ...args], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
