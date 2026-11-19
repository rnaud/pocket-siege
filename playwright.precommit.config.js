import { existsSync } from 'node:fs';
import base from './playwright.config.js';

const localChrome = process.platform === 'darwin' &&
  existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
export default {
  ...base,
  reporter: 'list',
  timeout: 180000,
  workers: 2,
  retries: 0,
  // A running development server must not make commits fail or serve stale code.
  use: { ...base.use, baseURL: 'http://127.0.0.1:5188' },
  webServer: process.env.RELATED_LOGIC_ONLY ? undefined : {
    ...base.webServer,
    command: 'npm run dev -- --port 5188 --strictPort',
    url: 'http://127.0.0.1:5188',
  },
  projects: base.projects.map(project => ({
    ...project,
    use: { ...project.use, ...(project.name === 'desktop' && localChrome ? { channel: 'chrome' } : {}) },
  })),
};
