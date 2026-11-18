import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename } from 'node:path';

const gitFiles = args => execFileSync('git', args, { encoding: 'utf8' }).split('\0').filter(Boolean);
const staged = gitFiles(['diff', '--cached', '--name-only', '-z']);
const relevant = file => /^(src\/|tests\/|public\/|index\.html$|armageddon\.html$|package(?:-lock)?\.json$|(?:vite|playwright).*config\.|scripts\/(?:test-related|install-hooks)\.mjs$|\.githooks\/)/.test(file);
const changed = staged.filter(relevant);
if (!changed.length) {
  console.log('No staged runtime/test changes; skipping tests.');
  process.exit(0);
}
// Never claim that passing worktree tests verified different staged contents.
// No stash/reset: leave the user's index and working tree untouched.
const unstaged = [...gitFiles(['diff', '--name-only', '-z']), ...gitFiles(['ls-files', '--others', '--exclude-standard', '-z'])].filter(relevant);
if (unstaged.length) {
  console.error(`Related checks need staged code to match the working tree. Stage or set aside these files first:\n${unstaged.join('\n')}`);
  process.exit(1);
}
const smoke = [
  'original art loads and character labels stay readable',
  'equipped weapons display their original native sprites',
  'slow loading shows only the loading screen',
  'failed assets do not enable play',
  'arsenal and field kit use native icons',
  'compact arsenal, overview and charge',
  'special tray fires shotgun, dynamite and airstrike',
];
const smokeFiles = ['tests/game.spec.js', 'tests/armageddon-animation.spec.js', 'tests/asset-loading.spec.js', 'tests/armageddon-hud-icons.spec.js', 'tests/polish.spec.js'];
const runtimeChanged = changed.some(file => /^(src\/|public\/|index\.html$|armageddon\.html$|package|.*config\.|scripts\/|\.githooks\/)/.test(file));
const smokeChanged = changed.some(file => /^(src\/(?:main\.js|style\.css|pixel-hud\.|weapons\.js|utilities\.js|physics\.js|armageddon\/(?:art|frontend|hud-icons|hud-frame|audio)\.js)|public\/|index\.html$|armageddon\.html$|package|.*config\.|scripts\/|\.githooks\/)/.test(file));
const smokePattern = smoke.join('|');
// Ask Playwright for its dependency graph, then add files read through fs
// rather than imports. Listing tests does not launch browsers or a server.
const selection = JSON.parse(execFileSync(process.execPath, [
  'node_modules/@playwright/test/cli.js', 'test', '--config=playwright.precommit.config.js',
  '--only-changed=HEAD', '--list', '--reporter=json',
], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 }));
if (selection.errors?.length) {
  console.error(selection.errors); process.exit(1);
}
const related = new Set();
//This existing spec reads the catalog and asset bytes through fs, so imports
//alone cannot reveal its dependency on media and canonical sprite files.
if (changed.some(file => /^public\/armageddon\/(?:media(?:\/|\.json$)|sprites\/)/.test(file)))
  related.add('tests/armageddon-media.spec.js');
function collect(suite) {
  for (const spec of suite.specs ?? []) related.add(`tests/${spec.file}`);
  for (const child of suite.suites ?? []) collect(child);
}
for (const suite of selection.suites ?? []) collect(suite);
for (const file of changed) {
  if (/^tests\/.*\.spec\.js$/.test(file) && existsSync(file)) related.add(file);
  if (/^(tests\/fixtures\/armageddon\/|src\/armageddon\/)/.test(file)) {
    const spec = `tests/armageddon-${basename(file).replace(/\.(json|js)$/, '')}.spec.js`;
    if (existsSync(spec)) related.add(spec);
  }
}
// Imports evaluated inside page.evaluate run in the browser and are absent
// from Playwright's Node dependency graph. Include their existing specs too.
const changedBrowserModules = new Set(changed.filter(file => file.startsWith('src/')).map(file => `/${file}`));
for (const name of readdirSync('tests')) {
  if (!name.endsWith('.spec.js')) continue;
  const file = `tests/${name}`;
  const imports = readFileSync(file, 'utf8').matchAll(/import\(\s*["']([^"']+)["']/g);
  if ([...imports].some(match => changedBrowserModules.has(match[1]))) related.add(file);
}
const files = [...related].sort();
const commands = files.length ? [
  { label: 'Related logic', args: ['--project=logic', ...files, '--pass-with-no-tests'], logic: true },
  { label: 'Related desktop tests', args: ['--project=desktop', ...files, '--pass-with-no-tests', ...(smokeChanged ? ['--grep-invert', `@logic|${smokePattern}`] : [])] },
] : [];
if (smokeChanged) commands.push({ label: 'Desktop smoke', args: ['--project=desktop', ...smokeFiles, '--grep', smokePattern] });
console.log(`Staged changes: ${changed.join(', ')}`);
if (process.argv.includes('--plan')) {
  for (const command of commands) console.log(`${command.label}: ${command.args.join(' ')}`);
  if (runtimeChanged) console.log('Production build');
  process.exit(0);
}
for (const command of commands) {
  console.log(`\n${command.label}`);
  const result = spawnSync(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', '--config=playwright.precommit.config.js', ...command.args], {
    stdio: 'inherit', env: { ...process.env, ...(command.logic ? { RELATED_LOGIC_ONLY: '1' } : {}) },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (runtimeChanged) {
  const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--base=./'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status || 1);
}
