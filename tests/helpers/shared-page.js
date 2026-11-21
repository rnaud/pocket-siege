import { test as base, expect } from "@playwright/test";
import fs from "node:fs";

// One loaded game page per worker. Loading the game (modules, art decoding,
// first map) costs most of a short browser test, so tests importing `test`
// from here reuse a page that is already booted: before each test the page's
// storage is restored to the configured storageState and
// window.siege.debug.resetForTest() brings back the fresh front end.
//
// The first page.goto("/") of a test on a reused page is skipped. Anything a
// test does that cannot be undone in place (init scripts, routes, exposed
// functions, viewport or media emulation, the browser context, held keys or
// buttons) marks the page dirty, and a dirty or failed test gets a fresh
// page next time.
export { expect };

const DIRTYING = ["addInitScript", "route", "routeFromHAR", "unroute", "unrouteAll", "exposeFunction", "exposeBinding",
  "setViewportSize", "emulateMedia", "setExtraHTTPHeaders", "context", "setDefaultTimeout",
  "setDefaultNavigationTimeout", "pause", "close"];

function storageFor(storageState, origin) {
  if (!storageState) return [];
  const state = typeof storageState === "string" ? JSON.parse(fs.readFileSync(storageState, "utf8")) : storageState;
  return state.origins?.find((entry) => entry.origin === origin)?.localStorage ?? [];
}

export const test = base.extend({
  _sharedGamePage: [async ({ browser }, use, workerInfo) => {
    const options = workerInfo.project.use;
    const contextOptions = {};
    for (const key of ["viewport", "userAgent", "deviceScaleFactor", "isMobile", "hasTouch", "locale", "timezoneId",
      "colorScheme", "reducedMotion", "baseURL", "storageState"])
      if (options[key] !== undefined) contextOptions[key] = options[key];
    const origin = new URL(options.baseURL).origin;
    const seed = storageFor(options.storageState, origin);
    let context = null;
    let page = null;
    const pool = {
      async acquire() {
        if (page && page.isClosed()) page = null;
        if (!page) {
          await context?.close().catch(() => {});
          context = await browser.newContext(contextOptions);
          page = await context.newPage();
        }
        if (page.url() === "about:blank" || new URL(page.url()).origin !== origin) await page.goto("/");
        await page.waitForFunction(() => window.siege?.getState().assetsReady, null, { polling: 10, timeout: 30000 });
        await page.evaluate((seed) => {
          localStorage.clear();
          sessionStorage.clear();
          for (const { name, value } of seed) localStorage.setItem(name, value);
          window.siege.debug.resetForTest();
        }, seed);
        return page;
      },
      discard() { page = null; },
    };
    await use(pool);
    await context?.close().catch(() => {});
  }, { scope: "worker" }],

  page: async ({ _sharedGamePage }, use, testInfo) => {
    const page = await _sharedGamePage.acquire();
    let dirty = false;
    let fresh = true;
    const restore = [];
    const patch = (target, name, wrap) => {
      const original = target[name];
      target[name] = wrap(original);
      restore.push(() => { target[name] = original; });
    };
    for (const name of DIRTYING)
      patch(page, name, (original) => function (...args) { dirty = true; return original.apply(this, args); });
    patch(page, "goto", (original) => async function (url, ...args) {
      // A booted, reset page already shows "/": skip the first reload.
      // Routes or init scripts set up before it need a real navigation.
      if (fresh && !dirty && (url === "/" || url === "")) { fresh = false; return null; }
      fresh = false;
      return original.call(this, url, ...args);
    });
    patch(page, "reload", (original) => function (...args) { fresh = false; return original.apply(this, args); });
    for (const device of [page.keyboard, page.mouse])
      patch(device, "down", (original) => function (...args) { dirty = true; return original.apply(this, args); });
    const listeners = new Map(page.eventNames().map((name) => [name, new Set(page.listeners(name))]));

    await use(page);

    for (const undo of restore.reverse()) undo();
    if (!page.isClosed()) for (const name of page.eventNames()) {
      const before = listeners.get(name) ?? new Set();
      for (const listener of page.listeners(name)) if (!before.has(listener)) page.removeListener(name, listener);
    }
    const failed = testInfo.status !== testInfo.expectedStatus;
    if (failed && !page.isClosed()) {
      const shot = await page.screenshot({ timeout: 5000 }).catch(() => null);
      if (shot) await testInfo.attach("screenshot", { body: shot, contentType: "image/png" });
    }
    if (failed || dirty || page.isClosed()) _sharedGamePage.discard();
  },
});
