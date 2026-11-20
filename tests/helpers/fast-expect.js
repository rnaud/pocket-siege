import { isDeepStrictEqual } from "node:util";

// Playwright records every expect() call as a report step, and adding a step
// scans the steps recorded so far, so a test making thousands of fixture
// assertions spends almost all of its time in step bookkeeping (quadratic in
// the number of assertions). fastExpect(expect) returns a drop-in expect whose
// toBe/toEqual/toStrictEqual first run an equivalent cheap check and only call
// Playwright's matcher (with its usual diff and message) when that check does
// not pass. Object.is matches toBe exactly; isDeepStrictEqual is stricter than
// toEqual/toStrictEqual, so a pass there implies a pass in Playwright and any
// other outcome is still decided by Playwright itself. Every other matcher,
// modifier (.not, .resolves) and expect property (poll, soft, ...) is forwarded.
const quick = {
  toBe: Object.is,
  toEqual: isDeepStrictEqual,
  toStrictEqual: isDeepStrictEqual,
};

export function fastExpect(expect) {
  const fast = (actual, ...rest) => {
    let real;
    const delegate = () => (real ??= expect(actual, ...rest));
    return new Proxy({}, {
      get(_, name) {
        const check = quick[name];
        if (check) return (expected) => (check(actual, expected) ? undefined : delegate()[name](expected));
        const value = delegate()[name];
        return typeof value === "function" ? value.bind(real) : value;
      },
    });
  };
  return new Proxy(fast, {
    get: (_, name) => expect[name],
    apply: (_, thisArg, args) => fast(...args),
  });
}
