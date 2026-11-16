import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
if (!process.env.CI && spawnSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' }).status === 0) {
  const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], { encoding: 'utf8' }).stdout.trim();
  const existing = execFileSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], { encoding: 'utf8' }).trim();
  if ((current && current !== '.githooks') || (!current && existsSync(existing))) {
    console.log('Existing Git hooks preserved. Run npm run test:related before committing.');
  } else {
    execFileSync('git', ['config', '--local', 'core.hooksPath', '.githooks']);
    console.log('Installed targeted pre-commit checks.');
  }
}
