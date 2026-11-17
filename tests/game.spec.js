import { test, expect } from "@playwright/test";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const original = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (array) => {
      if (array instanceof Uint32Array && array.length === 1) {
        array[0] = 42;
        return array;
      }
      return original(array);
    };
  });
});

async function openArsenal(page) {
  if (!(await page.locator(".weapon-panel").isVisible()))
    await page.locator("#inventory-toggle").click();
}
async function chargeShot(page, milliseconds = 600) {
  await expect(page.locator("#fire")).toBeEnabled();
  await page.keyboard.down("Space");
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up("Space");
}
test("play a full destructive turn with responsive controls", async ({
  page,
}, info) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  await expect(page.locator("#fire")).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const before = await page.evaluate(() => window.siege.getState());
  await setAim(page, "-60");
  await chargeShot(page);
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().team), {
      timeout: 20000,
    })
    .toBe(1);
  const after = await page.evaluate(() => window.siege.getState());
  expect(after.explosions).toBeGreaterThan(0);
  expect(after.terrainPixels).toBeLessThan(before.terrainPixels);
  await page.screenshot({
    path: `test-results/${info.project.name}-game.png`,
    fullPage: true,
  });
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await setAim(page, "90");
  await chargeShot(page);
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().team), {
      timeout: 20000,
    })
    .toBe(0);
  expect(errors).toEqual([]);
});
test("computer takes its turn and returns control", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#start").click();
  await setAim(page, "90");
  await chargeShot(page);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 18000,
    })
    .toBe(1);
  await expect(page.locator("#fire")).toBeDisabled();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().round), {
      timeout: 25000,
    })
    .toBe(2);
  await expect(page.locator("#fire")).toBeEnabled();
});
test("movement, jump, and pointer aiming", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#start").click();
  const before = await page.evaluate(() => window.siege.getState().worms[0]);
  await page.locator('[data-move="1"]').scrollIntoViewIfNeeded();
  const button = await page.locator('[data-move="1"]').boundingBox();
  await page.mouse.move(
    button.x + button.width / 2,
    button.y + button.height / 2,
  );
  await page.mouse.down();
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().worms[0].x))
    .toBeGreaterThan(before.x + 6);
  await page.mouse.up();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].ground))
    .toBe(true);
  const jumpY = await page.evaluate(() => window.siege.getState().worms[0].y);
  await page.locator("#jump").click();
  await expect
    .poll(async () => page.evaluate(() => window.siege.getState().worms[0].y))
    .toBeGreaterThan(jumpY + 10);
  const field = await page.locator("#arena").boundingBox();
  await page.mouse.click(
      field.x + field.width * 0.7,
      field.y + field.height * 0.2,
    );
  expect(await page.locator("#angle").inputValue()).not.toBe("45");

});


test("original art loads and character labels stay readable", async ({
  page,
}, info) => {
  const missing = [];
  page.on("response", (r) => {
    if (r.url().includes("/armageddon/") && r.status() !== 200) missing.push(r.url());
  });
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-art-menu.png`,
    fullPage: true,
  });
  await expect(page.locator("#start")).toBeInViewport();
  await page.locator("#start").click();
  await expect(page.locator(".worm-label")).toHaveCount(6);
  const labels = await page.locator('.native-worm-text').evaluateAll(canvases =>
    canvases.map(canvas => ({ width: canvas.width, height: canvas.height,
      rendering: getComputedStyle(canvas).imageRendering })));
  expect(labels).toHaveLength(6);
  for (const label of labels) {
    expect(label.width).toBeGreaterThan(0);
    expect(label.height).toBe(33);
    expect(label.rendering).toBe('pixelated');
  }
  await page.screenshot({
    path: `test-results/${info.project.name}-art-battle.png`,
    fullPage: true,
  });
  expect(missing).toEqual([]);
});

test("crosshair and articulated weapon follow upward and downward aim", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await expect(page.locator("#aim-reticle")).toBeVisible();
  await setAim(page, "90");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].weaponRotation),
    )
    .toBeCloseTo(Math.PI / 2, 2);
  await page.screenshot({
    path: `test-results/${info.project.name}-aim-up.png`,
    fullPage: true,
  });
  // Fire vertically into the ground beneath the shooter. A diagonal shot
  // can pass the ledge and explode outside self-damage range with native masks.
  await setAim(page, "-90");
  await expect
    .poll(() =>
      page.evaluate(() => window.siege.getState().worms[0].weaponRotation),
    )
    .toBeLessThan(0);
  const aim = await page.evaluate(() => window.siege.getState().aim);
  expect(aim.muzzle.y).toBeLessThan(aim.pivot.y);
  await page.screenshot({
    path: `test-results/${info.project.name}-aim-down.png`,
    fullPage: true,
  });
  await chargeShot(page);
  await expect(page.locator("#aim-guide")).toBeHidden();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].pose), {
      intervals: [20, 30, 50],
      timeout: 5000,
    })
    .toBe("hurt");
  await expect(page.locator(".worm-label.hurt")).not.toHaveCount(0);
  await page.screenshot({
    path: `test-results/${info.project.name}-hurt.png`,
    fullPage: true,
  });
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.worms[0].hp).toBeLessThan(100);
  expect(state.worms[0].hits).toBeGreaterThan(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 20000,
    })
    .toBe(1);
  await expect(page.locator("#aim-reticle")).toBeVisible();
});

test("grenade shows fuse and swaps weapon, help pauses the turn", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await setAim(page, "90");
  await chargeShot(page);
  await expect(page.locator("#projectile-tag")).toContainText(/\d\.\ds/);
  await expect(page.locator('[data-weapon="rocket"]')).toBeDisabled();
  await page.locator("#help").click();
  const before = await page.evaluate(() => window.siege.getState().projectile);
  await page.waitForTimeout(350);
  expect(await page.evaluate(() => window.siege.getState().projectile)).toEqual(
    before,
  );
  await page.locator(".close-help").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 15000,
    })
    .toBe(1);
});

test("Space charges until release, arrows only aim, and no shot prediction exists", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  await expect(page.locator("#power")).toHaveCount(0);
  await expect(
    page.locator(".arc,.arc-shadow,.impact-marker,.impact-caption"),
  ).toHaveCount(0);
  await setAim(page, "45");
  const y = await page.evaluate(() => window.siege.getState().worms[0].y);
  await page.keyboard.down("ArrowUp");
  await expect
    .poll(async () => Number(await page.locator("#angle").inputValue()), {
      timeout: 5000,
    })
    .toBeGreaterThan(45);
  await page.keyboard.up("ArrowUp");
  expect(
    Math.abs(
      (await page.evaluate(() => window.siege.getState().worms[0].y)) - y,
    ),
  ).toBeLessThan(2);
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowDown");
  await page.keyboard.down("Space");
  // Wait on simulation state, not wall-clock time: a loaded CI runner may
  // process fewer fixed steps than a local machine in the same interval.
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().power), {
      timeout: 5000,
    })
    .toBeGreaterThan(10);
  const held = await page.evaluate(() => window.siege.getState());
  expect(held.charging).toBe(true);
  expect(held.shotCount).toBe(0);
  expect(held.projectile).toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().power), {
      timeout: 5000,
    })
    .toBeGreaterThan(Math.max(held.power + 5, 30));
  await page.keyboard.up("Space");
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  expect(
    await page.evaluate(() => window.siege.getState().firedPower),
  ).toBeGreaterThan(25);
});

test("holding fire caps at one full-power shot and canceled input does not shoot", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  const b = page.locator("#fire");
  await b.scrollIntoViewIfNeeded();
  const rect = await b.boundingBox();
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.siege.getState().charging)).toBe(
    true,
  );
  await page.dispatchEvent("#fire", "pointercancel");
  await page.mouse.up();
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(0);
  await page.keyboard.down("Space");
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotCount), {
      timeout: 5000,
    })
    .toBe(1);
  expect(await page.evaluate(() => window.siege.getState().firedPower)).toBe(
    100,
  );
  await page.keyboard.up("Space");
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
});

test("grenade fuse selection and retreat movement work without granting another shot", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await page.keyboard.press("5");
  await page.keyboard.press("-");
  expect(await page.evaluate(() => window.siege.getState().fuse)).toBe(5);
  expect(await page.locator("#bounce").inputValue()).toBe("0.3");
  await setAim(page, "90");
  await chargeShot(page, 1200);
  await expect(page.locator("#projectile-tag")).toContainText(/4\.\ds/);
  const before = await page.evaluate(() => window.siege.getState().worms[0].x);
  await page.keyboard.down("ArrowRight");
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].x), {
      timeout: 5000,
    })
    .toBeGreaterThan(before + 3);
  await page.keyboard.up("ArrowRight");
  await page.keyboard.press("Space");
  expect(await page.evaluate(() => window.siege.getState().shotCount)).toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().retreat), {
      timeout: 5000,
    })
    .toBe(0);
});

async function setAim(page, value) {
  // Set up a reproducible shot; separate tests cover the real keyboard/touch controls.
  await page.locator("#angle").evaluate((el, value) => {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
}
test("pixel HUD exposes aim and charge, W/S aim and walking keep fire stable", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator(".aim-panel")).toBeVisible();
  await expect(page.locator("#power-meter")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
  const before = Number(await page.locator("#angle").inputValue());
  await page.keyboard.down("w");
  await expect
    .poll(async () => Number(await page.locator("#angle").inputValue()), {
      timeout: 5000,
    })
    .toBeGreaterThan(before);
  await page.keyboard.up("w");
  await page.keyboard.down("s");
  await page.waitForTimeout(200);
  await page.keyboard.up("s");
  await page.evaluate(() => {
    window.fireFlickers = 0;
    new MutationObserver((ms) => {
      window.fireFlickers += ms.filter(
        (m) =>
          m.attributeName === "disabled" &&
          document.querySelector("#fire").disabled,
      ).length;
    }).observe(document.querySelector("#fire"), { attributes: true });
  });
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(600);
  await page.keyboard.up("ArrowRight");
  expect(await page.evaluate(() => window.fireFlickers)).toBe(0);
  // Original terrain objects can create a drop after walking. Charging is
  // intentionally grounded-only; wait for landing instead of a fixed delay.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const state = window.siege.getState();
        const worm = state.worms[state.current];
        return worm.ground && !worm.knocked;
      }),
    )
    .toBe(true);
  await page.keyboard.down("Space");
  await expect(page.locator(".original-charge-blobs")).toBeVisible();
  await expect
    .poll(async () =>
      Number(await page.locator("#power-meter").getAttribute("aria-valuenow")),
    )
    .toBeGreaterThan(0);
  await expect
    .poll(() =>
      page.locator(".original-charge-blobs").evaluate((canvas) => {
        const pixels = canvas
          .getContext("2d")
          .getImageData(0, 0, canvas.width, canvas.height).data;
        return (
          +canvas.dataset.blobCount > 1 &&
          pixels.some((value, i) => i % 4 === 3 && value > 0)
        );
      }),
    )
    .toBe(true);
  await page.screenshot({
    path: `test-results/${info.project.name}-hud-charge.png`,
  });
  await page.keyboard.up("Space");
  await expect(page.locator("#power-meter")).toHaveAttribute(
    "aria-valuenow",
    "0",
  );
});
for (const weapon of ["mortar", "sticky"])
  test(`${weapon} fires with its own impact behavior`, async ({ page }) => {
    await page.goto("/");
    await page.locator("#mode").selectOption("local");
    await page.locator("#start").click();
    await openArsenal(page);
    await page.locator(`[data-weapon="${weapon}"]`).click();
    await setAim(page, "-60");
    const before = await page.evaluate(
      () => window.siege.getState().terrainPixels,
    );
    await chargeShot(page, 300);
    if (weapon === "sticky") {
      await expect
        .poll(() =>
          page.evaluate(() => window.siege.getState().projectile?.stuck),
        )
        .toBe(true);
      const p = await page.evaluate(() => window.siege.getState().projectile);
      expect(p.vx).toBe(0);
      expect(p.vy).toBe(0);
    }
    await expect
      .poll(() => page.evaluate(() => window.siege.getState().explosions))
      .toBeGreaterThan(0);
    expect(
      await page.evaluate(() => window.siege.getState().terrainPixels),
    ).toBeLessThan(before);
  });

test("limited weapons spend ammo and update their counts", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator('[data-weapon="grenade"] small')).toHaveText("3");
  await openArsenal(page);
  await page.locator('[data-weapon="grenade"]').click();
  await setAim(page, "90");
  await chargeShot(page, 300);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().ammo[0].grenade))
    .toBe(2);
  await expect(page.locator('[data-weapon="grenade"] small')).toHaveText("2");
  await expect(page.locator('[data-weapon="mortar"] small')).toHaveText("2");
});

test("computer skill is selectable and hidden for local play", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#difficulty-row")).toBeVisible();
  await page.selectOption("#difficulty", "veteran");
  await page.locator("#start").click();
  expect(await page.evaluate(() => window.siege.getState().difficulty)).toBe(
    "veteran",
  );
  await page.locator("#restart").click();
  await page.selectOption("#mode", "local");
  await expect(page.locator("#difficulty-row")).toBeHidden();
});

test("worm labels retain original world anchors while aiming", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  await expect(page.locator("#aim-reticle")).toBeVisible();
  await expect(page.locator(".worm-label.active")).toContainText("Sprout");
  for (const angle of [0, 90, -45]) {
    await page.locator('#angle').fill(String(angle));
    await page.locator('#angle').dispatchEvent('input');
    const anchors = await page.evaluate(() => {
      const state = window.siege.getState();
      return [...document.querySelectorAll('.worm-label')].map((label, i) => ({
        x: +label.dataset.nativeX, y: +label.dataset.nativeTop,
        bodyX: state.worms[i].x, bodyY: state.world.height - state.worms[i].y,
        transform: getComputedStyle(label).transform,
      }));
    });
    for (const anchor of anchors) {
      expect(Math.abs(anchor.x - anchor.bodyX)).toBeLessThanOrEqual(1);
      expect(anchor.bodyY - anchor.y).toBeGreaterThanOrEqual(41);
      expect(anchor.bodyY - anchor.y).toBeLessThanOrEqual(43);
      expect(anchor.transform).toBe('none');
    }
  }
});

test("share metadata and manifest avoid retired bitmap branding", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content",
    /Pocket Siege/,
  );
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(0);
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "./manifest.webmanifest",
  );
  const manifest = await page.evaluate(async () =>
    (await fetch("./manifest.webmanifest")).json(),
  );
  expect(manifest.name).toBe("Pocket Siege");
  expect(manifest.start_url).toBe("./");
  expect(manifest.display).toBe("standalone");
  await expect(page.locator('link[href*="/art/"]')).toHaveCount(0);
});

test("desktop fills the window without page scrolling", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop", "desktop layout");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#fire")).toBeEnabled();
  const layout = await page.evaluate(() => {
    const app = document.querySelector("#app").getBoundingClientRect(),
      arena = document.querySelector("#arena").getBoundingClientRect();
    return {
      appWidth: Math.round(app.width),
      appLeft: Math.round(app.left),
      arenaHeight: Math.round(arena.height),
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    };
  });
  expect(layout.appWidth).toBe(layout.viewportWidth);
  expect(layout.appLeft).toBe(0);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.arenaHeight).toBeGreaterThan(layout.viewportHeight * 0.55);
  await expect(page.locator("#fire")).toBeInViewport({ ratio: 1 });
});

test("best-of-three, storm weather and a supply crate start together", async ({
  page,
}) => {
  await page.goto("/");
  await page.selectOption("#format", "best3");
  await page.selectOption("#weather", "storm");
  await page.locator("#start").click();
  await expect(page.locator("#series")).toBeVisible();
  await expect(page.locator("#series")).toContainText("0–0");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.format).toBe("best3");
  expect(state.weather).toBe("storm");
  expect(state.seriesWins).toEqual([0, 0]);
  expect([
    "health",
    "grenade",
    "mortar",
    "sticky",
    "utility",
    "special",
  ]).toContain(state.crate?.kind);
  expect(
    await page.evaluate(
      () => document.querySelector("#weather-layer").className,
    ),
  ).toBe("storm");
  expect(Math.abs(state.wind)).toBeLessThanOrEqual(26);
});

test("daily island starts a seeded clear-weather solo match", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#daily").click();
  await expect(page.locator("#menu")).not.toBeVisible();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.daily).not.toBeNull();
  expect(state.daily.seed).toBeGreaterThanOrEqual(100);
  expect(state.daily.seed).toBeLessThan(1000);
  expect(state.format).toBe("single");
  expect(state.weather).toBe("clear");
  expect(state.mode).toBe("ai");
  expect(await page.evaluate(() => document.querySelector("#mode").value)).toBe(
    "ai",
  );
  expect(
    await page.evaluate(
      () => document.querySelector(".location span").textContent,
    ),
  ).toBe("DAILY ISLAND");
  expect(
    await page.evaluate(
      () => document.querySelector("#weather-layer").className,
    ),
  ).toBe("");
});

test("a persisted record book appears in the menu", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.setItem(
      "pocket-siege-record-v1",
      JSON.stringify({
        played: 4,
        wins: 3,
        losses: 1,
        streak: 2,
        bestStreak: 3,
        bestHit: 87,
        longest: 912,
        daily: { date: "", won: null },
      }),
    );
  });
  await page.reload();
  await expect(page.locator("#record-summary")).toContainText("3W–1L");
  await expect(page.locator("#record-summary")).toContainText("BEST HIT 87");
  await expect(page.locator("#record-summary")).toContainText("LONGEST 912");
});

test("best-of-three advances islands and records the series", async ({
  page,
}) => {
  await page.goto("/");
  await page.selectOption("#format", "best3");
  await page.locator("#start").click();
  await expect(page.locator("#series")).toContainText("0–0");
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("break");
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.seriesWins).toEqual([1, 0]);
  expect(state.breakTimer).toBeGreaterThan(0);
  await expect(page.locator("#series")).toContainText("1–0");
  await page.evaluate(() => window.siege.debug.skipBreak());
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("aim");
  state = await page.evaluate(() => window.siege.getState());
  expect(state.seriesWins).toEqual([1, 0]);
  expect(state.seriesRound).toBe(2);
  expect(state.team).toBe(1);
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  state = await page.evaluate(() => window.siege.getState());
  expect(state.seriesWins).toEqual([2, 0]);
  expect(state.record).toMatchObject({ played: 1, wins: 1, losses: 0 });
  await page.locator("#restart").click();
  await expect(page.locator("#record-summary")).toContainText("1W–0L");
});

test("daily island records today's result in the local record book", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#daily").click();
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.daily).not.toBeNull();
  expect(state.record.daily).toEqual({ date: state.daily.date, won: true });
  expect(state.record).toMatchObject({ played: 1, wins: 1, losses: 0 });
  await page.locator("#restart").click();
  await expect(page.locator("#daily-status")).toContainText("TODAY: WON");
});

test("supply crate and a killing blow feed the pickup and slow-motion systems", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  const before = await page.evaluate(() => window.siege.getState());
  expect(before.crate).not.toBeNull();
  await page.evaluate(() => window.siege.debug.collectCrate());
  const after = await page.evaluate(() => window.siege.getState());
  expect(after.crate).toBeNull();
  if (before.crate.kind === "health")
    expect(after.worms[0].hp).toBeGreaterThanOrEqual(before.worms[0].hp);
  else if (before.crate.kind === "utility" || before.crate.kind === "special")
    expect(after.crate).toBeNull();
  else
    expect(after.ammo[0][before.crate.kind]).toBe(
      before.ammo[0][before.crate.kind] + 1,
    );
  await page.evaluate(() => window.siege.debug.hit(1, 200));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().slowMo))
    .toBeGreaterThan(0);
  await expect(page.locator("#arena")).toHaveClass(/slow-mo/);
});

test("match modifiers change gravity, blast size and turn length", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.selectOption("#modifier", "moon-chaos");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  const state = await page.evaluate(() => window.siege.getState());
  expect(state.modifier).toBe("moon-chaos");
  expect(state.gravityScale).toBe(0.55);
  expect(state.blastScale).toBe(1.35);
  expect(state.turnSeconds).toBe(30);
});

test("action camera follows the shot and snaps back for the next turn", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#angle").evaluate((el) => {
    el.value = "45";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await chargeShot(page, 1100);
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  await expect
      .poll(() => page.evaluate(() => window.siege.getState().camera.zoom), {
        timeout: 6000,
      })
      .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 20000,
    })
    .toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().camera.zoom), {
      timeout: 3000,
    })
    .toBe(1);
  expect(await page.evaluate(() => window.siege.getState().nativeCameraFocus)).toBeNull();
});

test("a proximity mine spends ammo, arms, and detonates", async ({ page }) => {
  const mineSounds = [];
  page.on("request", r => { if (/\/(minearm|minetick|mineimpact)\.wav$/.test(r.url())) mineSounds.push(r.url().split("/").pop()); });
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.resetSeed(42));
  await page.locator("#sound").click();
  await openArsenal(page);
  await page.locator('[data-weapon="mine"]').click();
  await expect(page.locator("#fire-label")).toHaveText("PLACE MINE");
  await page.locator("#fire").click();
  await page.evaluate(() => {
    window.mineSprites = new Set();
    function sample() {
      const mine = window.siege.getState().mines[0];
      if (!mine) return;
      window.mineSprites.add(mine.sprite);
      requestAnimationFrame(sample);
    }
    sample();
  });
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.mines).toHaveLength(1);
  expect(state.ammo[0].mine).toBe(1);
  expect(state.phase).toBe("settle");
  expect(state.mines[0].nativeTimer.fuse).toBe(3000);
  expect(state.mines[0].nativeTimer.damage).toBe(50);
  expect(state.mines[0].nativeSlot).toBe(0);
  expect(state.mines[0].nativeCreatedFrame).toBeGreaterThanOrEqual(0);
  expect(state.mines[0].nativeTimer.placed).toBe(1);
  expect(state.mines[0].nativeTimer.arm).toBeGreaterThan(3500);
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.siege.getState().mines[0]?.nativeTimer.triggered), { timeout: 7000 }).toBe(1);
  const armed = await page.evaluate(() => window.siege.getState().mines[0]);
  expect(armed.nativeBody.type).toBe(10);
  expect(armed.nativeBody.shape).toBe(2);
  expect(armed.nativeBody.complex).toBe(1);
  // Placement can settle before the first browser snapshot. Native body
  // properties, impact sound, and detonation below verify the live mine.
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().explosions), {
      timeout: 12000,
    })
    .toBeGreaterThan(0);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.mines).toHaveLength(0);
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).toBeNull();
  expect(mineSounds.sort()).toEqual(["minearm.wav", "mineimpact.wav", "minetick.wav"]);
  expect(await page.evaluate(() => [...window.mineSprites].sort())).toEqual(["mineoff", "mineon"]);
});

test("the last shot can be replayed over the battlefield", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#angle").evaluate((el) => {
    el.value = "45";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await chargeShot(page, 900);
  await expect
    .poll(
      () => page.evaluate(() => window.siege.getState().lastShot?.points ?? 0),
      { timeout: 15000 },
    )
    .toBeGreaterThan(2);
  await expect
    .poll(() => page.locator("#replay").isEnabled(), { timeout: 20000 })
    .toBe(true);
  await page.locator("#replay").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().replaying))
    .toBe(true);
  await expect(page.locator(".replay-path")).toHaveAttribute("d", /^M/);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().replaying), {
      timeout: 7000,
    })
    .toBe(false);
});

test("a finished match enables the result card", async ({ page }, info) => {
  await page.goto("/");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  await page.locator("#restart").click();
  await expect(page.locator("#share")).toBeEnabled();
  expect(
    await page.evaluate(() => window.siege.getState().lastResult.winner),
  ).toBe(0);
  {
    const pendingDownload = page.waitForEvent("download");
    await page.locator("#share").click();
    const download = await pendingDownload;
    expect(await download.failure()).toBeNull();
    await download.saveAs("test-results/desktop-result-card.png");
  }
});

test("saved settings survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.locator("#difficulty").selectOption("veteran");
  await page.locator("#mode").selectOption("local");
  await page.selectOption("#format", "best3");
  await page.selectOption("#weather", "storm");
  await page.selectOption("#modifier", "low-gravity");
  await page.selectOption("#scheme", "custom");
  await page.selectOption("#turn-time", "60");
  await page.selectOption("#retreat-time", "8");
  await page.selectOption("#sudden-death", "nuke");
  await page.locator("#start").click();
  await page.locator("#sound").click();
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  expect(await page.locator("#mode").inputValue()).toBe("local");
  expect(await page.locator("#difficulty").inputValue()).toBe("veteran");
  expect(await page.locator("#format").inputValue()).toBe("best3");
  expect(await page.locator("#weather").inputValue()).toBe("storm");
  expect(await page.locator("#modifier").inputValue()).toBe("low-gravity");
  expect(await page.locator("#turn-time").inputValue()).toBe("60");
  expect(await page.locator("#retreat-time").inputValue()).toBe("8");
  expect(await page.locator("#sudden-death").inputValue()).toBe("nuke");
  expect(await page.locator("#scheme").inputValue()).toBe("custom");
  await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
});

test("worm selection, turn pace and skip change the turn economy", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.selectOption("#turn-time", "60");
  await page.selectOption("#retreat-time", "8");
  await page.locator("#start").click();
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.turnSeconds).toBe(60);
  expect(state.retreatSeconds).toBe(8);
  await expect(page.locator("#timer")).toContainText("60");
  const first = state.current;
  await page.locator("#select-worm").click();
  state = await page.evaluate(() => window.siege.getState());
  expect(state.current).not.toBe(first);
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#select-worm")).toBeHidden();
  await page.locator("#skip").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 5000,
    })
    .toBe(1);
});

test("sudden-death health and nuclear variants apply", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.selectOption("#mode", "local");
  await page.selectOption("#sudden-death", "health");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.suddenDeathType).toBe("health");
  expect(state.sdTriggered).toBe(true);
  expect(state.worms.every((w) => w.hp === 1)).toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.selectOption("#sudden-death", "nuke");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.triggerSuddenDeath());
  state = await page.evaluate(() => window.siege.getState());
  expect(state.poisoned).toBe(true);
});

test("surrender ends a live match from the menu", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#surrender")).toBeHidden();
  await page.locator("#restart").click();
  await expect(page.locator("#surrender")).toBeVisible();
  await page.locator("#surrender").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().phase))
    .toBe("over");
  expect(
    await page.evaluate(() => window.siege.getState().lastResult.winner),
  ).toBe(1);
});

test("field kit teleport and girder target the battlefield", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await expect(page.locator("[data-utility]")).toHaveCount(6);
  await page.locator('[data-utility="teleport"]').click();
  let box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.2);
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.utilities.teleport).toBe(0);
  expect(state.phase).toBe("settle");
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).not.toBeNull();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().worms[0].y))
    .toBeGreaterThan(300);
  await expect.poll(() => page.evaluate(() => window.siege.getState().nativeCameraFocus)).toBeNull();

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="girder"]').click();
  box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.25, box.y + box.height * 0.3);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.girders).toHaveLength(1);
  expect(state.utilities.girder).toBe(0);
  expect(state.phase).toBe("settle");
});

test("rope attaches and releases; jetpack burns fuel", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#map-layout").selectOption("fern");
  await page.locator("#start").click();
  let attached = false;
  for (const angle of [0, -10, 10, -30, 30, -50]) {
    await page.locator("#angle").evaluate((el, value) => {
      el.value = String(value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, angle);
    await page.keyboard.press("r");
    await page.waitForTimeout(40);
    attached = await page.evaluate(() => window.siege.getState().rope.attached);
    if (attached) break;
  }
  expect(attached).toBe(true);
  await page.evaluate(() => window.siege.debug.releaseRope());
  expect(await page.evaluate(() => window.siege.getState().rope.attached)).toBe(
    false,
  );
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="jetpack"]').click();
  await page.waitForTimeout(250);
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.jetpack.active).toBe(true);
  expect(state.jetpack.fuel).toBeLessThan(30);
  await page.keyboard.press("j");
  state = await page.evaluate(() => window.siege.getState());
  expect(state.jetpack.active).toBe(false);
});

test("parachute and freeze utilities resolve their effects", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="parachute"]').click();
  expect(
    await page.evaluate(() => window.siege.getState().parachuteArmed),
  ).toBe(true);
  await page.locator("#utilities-toggle").click();
  await page.locator('[data-utility="freeze"]').click();
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.frozen).toEqual([1, 1, 1, 0, 0, 0]);
  expect(state.utilities.freeze).toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team), {
      timeout: 5000,
    })
    .toBe(1);
  expect(await page.evaluate(() => window.siege.getState().frozen)).toEqual([
    1, 1, 1, 0, 0, 0,
  ]);
  await page.locator("#skip").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().team))
    .toBe(0);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().frozen), {
      timeout: 5000,
    })
    .toEqual([0, 0, 0, 0, 0, 0]);
});

test("special tray fires shotgun, dynamite and airstrike", async ({ page }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await openArsenal(page);

  await expect(page.locator(".weapons [data-weapon]")).toHaveCount(26);
  await page.locator('[data-weapon="shotgun"]').click();
  await page.evaluate(() => {
    window.shotgunSpriteProbe = {
      active: true,
      shothit: false,
      shotcase: false,
    };
    const sample = () => {
      const probe = window.shotgunSpriteProbe;
      if (!probe.active) return;
      for (const p of window.siege.getState().nativeParticles) {
        if (p.sprite === "shothit" || p.sprite === "shotcase")
          probe[p.sprite] = true;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotCount))
    .toBe(1);
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].shotgun).toBe(2);
  expect(state.phase).toBe("aim");
  expect(state.shotgunRemaining).toBe(1);
  await expect
    .poll(() => page.evaluate(() => window.shotgunSpriteProbe.shothit))
    .toBe(true);
  expect(await page.evaluate(() => window.shotgunSpriteProbe.shotcase)).toBe(
    true,
  );
  await page.evaluate(() => {
    window.shotgunSpriteProbe.active = false;
  });
  await page.locator("#fire").click();
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().shotCount))
    .toBe(2);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].shotgun).toBe(2);
  expect(state.shotgunRemaining).toBe(0);
  expect(state.phase).toBe("settle");
  expect(state.lastShot.impact.kind).toBe("shotgun");

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await openArsenal(page);

  await page.locator('[data-weapon="dynamite"]').click();
  await page.locator("#fire").click();
  await page.waitForTimeout(150);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].dynamite).toBe(1);
  expect(state.bombs.some((b) => b.kind === "dynamite")).toBe(true);

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await openArsenal(page);

  await page.locator('[data-weapon="airstrike"]').click();
  await page.locator("#fire").click();
  expect(await page.evaluate(() => window.siege.getState().targetUtility)).toBe(
    "airstrike",
  );
  const box = await page.locator("#arena").boundingBox();
  await page.mouse.click(box.x + box.width * 0.65, box.y + box.height * 0.4);
  await expect.poll(() => page.evaluate(() => window.siege.getState().bombs.length)).toBe(5);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.ammo[0].airstrike).toBe(0);
  expect(state.bombs.length).toBe(5);
});

test("cluster bomblets and napalm fires resolve their effects", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "cluster"));
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.explosions).toBeGreaterThanOrEqual(1);
  expect(state.bombs.length).toBeGreaterThanOrEqual(4);
  expect(state.ammo[0].cluster).toBe(2);

  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.explodeAt(600, 350, "napalm"));
  state = await page.evaluate(() => window.siege.getState());
  expect(state.fires.length).toBe(3);
  expect(state.ammo[0].napalm).toBe(2);
});

test("scheme presets apply turn pace, sudden death and stockpile rules", async ({
  page,
}) => {
  await page.goto("/");
  await page.selectOption("#scheme", "blitz");
  expect(await page.locator("#turn-time").inputValue()).toBe("30");
  expect(await page.locator("#retreat-time").inputValue()).toBe("5");
  expect(await page.locator("#sudden-death").inputValue()).toBe("health");
  await page.locator("#start").click();
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.scheme).toBe("blitz");
  expect(state.turnSeconds).toBe(30);
  expect(state.retreatSeconds).toBe(5);
  expect(state.suddenDeathType).toBe("health");
  expect(state.crateRain).toBe(true);
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.selectOption("#scheme", "stockpile");
  expect(await page.locator("#format").inputValue()).toBe("best3");
  await page.locator("#start").click();
  state = await page.evaluate(() => window.siege.getState());
  expect(state.scheme).toBe("stockpile");
  expect(state.stockpile).toBe(true);
  expect(state.format).toBe("best3");
});

test("stockpile keeps ammo and utilities across series islands", async ({
  page,
}) => {
  await page.goto("/");
  await page.selectOption("#scheme", "stockpile");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.setAmmo(0, "grenade", 7));
  await page.evaluate(() => window.siege.debug.knockout(1));
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().seriesWins), {
      timeout: 6000,
    })
    .toEqual([1, 0]);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().ammo[0].grenade), {
      timeout: 6000,
    })
    .toBe(7);
});

test("special and utility crates stock the field kit", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  const specialKinds = await page.locator('.weapons [data-weapon]').evaluateAll(buttons => buttons.slice(5).map(button => button.dataset.weapon));
  await page.evaluate(kinds => {
    for (const kind of kinds) window.siege.debug.setAmmo(0, kind, 0);
  }, specialKinds);
  const beforeSpecial = await page.evaluate(
    () => window.siege.getState().ammo[0],
  );
  await page.evaluate(() => window.siege.debug.setCrateKind("special"));
  await page.evaluate(() => window.siege.debug.collectCrate());
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.crate).toBeNull();
  const specialTotal = (loadout) => specialKinds.reduce((sum, kind) => sum + loadout[kind], 0);
  expect(specialTotal(state.ammo[0])).toBe(1);
  expect(specialTotal(beforeSpecial)).toBe(0);

  await page.reload();
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.evaluate(() => window.siege.debug.setCrateKind("utility"));
  await page.evaluate(() => window.siege.debug.collectCrate());
  state = await page.evaluate(() => window.siege.getState());
  expect(state.crate).toBeNull();
  expect(
    Object.entries(state.utilities)
      .filter(([kind]) => kind !== "rope")
      .reduce((sum, [, n]) => sum + n, 0),
  ).toBeGreaterThan(5);
});
