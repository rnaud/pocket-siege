import { test, expect } from "@playwright/test";
import { Terrain } from "../src/physics.js";
async function chargeShot(page, milliseconds = 600) {
  await expect(page.locator("#fire")).toBeEnabled();
  await page.keyboard.down("Space");
  await page.waitForTimeout(milliseconds);
  await page.keyboard.up("Space");
}
test("terrain craters remove solid ground and preserve distant terrain", () => {
  const t = new Terrain(42),
    x = 400,
    y = t.surface(x) - 15;
  expect(t.solid(x, y)).toBe(true);
  const other = t.surface(800);
  expect(t.carve(x, y, 50)).toBeGreaterThan(1000);
  expect(t.solid(x, y)).toBe(false);
  expect(t.surface(800)).toBe(other);
  expect(t.carve(x, y, 50)).toBe(0);
});
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
test("movement, jump, touch aiming, and landscape layout", async ({
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
  if (info.project.name === "iphone")
    await page.touchscreen.tap(
      field.x + field.width * 0.7,
      field.y + field.height * 0.2,
    );
  else
    await page.mouse.click(
      field.x + field.width * 0.7,
      field.y + field.height * 0.2,
    );
  expect(await page.locator("#angle").inputValue()).not.toBe("45");
  if (info.project.name === "iphone") {
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator("#fire")).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.querySelector("canvas").width ===
            document.querySelector("#arena").clientWidth *
              Math.min(devicePixelRatio, 2),
        ),
      )
      .toBe(true);
    await page.screenshot({
      path: "test-results/iphone-landscape.png",
      fullPage: true,
    });
  }
});
test("touch controls fit the screen in portrait and landscape", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "iphone", "touch layout");
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#start").click();
  const controls = [
    "#fire",
    "#angle",
    '[data-weapon="rocket"]',
    '[data-weapon="grenade"]',
    '[data-weapon="mortar"]',
    '[data-weapon="sticky"]',
    '[data-weapon="mine"]',
  ];
  const fits = async () => {
    for (const selector of controls)
      await expect(page.locator(selector)).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () =>
          document.documentElement.scrollHeight <= innerHeight + 1 &&
          document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    // Ammo counts stay inside their weapon buttons rather than drifting below them.
    expect(
      await page.evaluate(() =>
        [...document.querySelectorAll(".weapons button")].every((button) => {
          const outer = button.getBoundingClientRect(),
            count = button.querySelector("small").getBoundingClientRect();
          return (
            count.top >= outer.top &&
            count.bottom <= outer.bottom &&
            count.left >= outer.left &&
            count.right <= outer.right
          );
        }),
      ),
    ).toBe(true);
  };
  await fits();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(400);
  await fits();
});

test("generated art loads and character labels stay readable", async ({
  page,
}, info) => {
  const missing = [];
  page.on("response", (r) => {
    if (r.url().includes("/art/") && r.status() !== 200) missing.push(r.url());
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
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const boxes = [...document.querySelectorAll(".worm-label")].map((e) =>
          e.getBoundingClientRect(),
        );
        return boxes.every((a, i) =>
          boxes.every(
            (b, j) =>
              i === j ||
              a.right <= b.left ||
              b.right <= a.left ||
              a.bottom <= b.top ||
              b.bottom <= a.top,
          ),
        );
      }),
    )
    .toBe(true);
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
  await setAim(page, "-60");
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
test("desktop hides slider, W/S aim, walking keeps fire stable, charge lives on reticle", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  if (info.project.name === "desktop")
    await expect(page.locator(".aim-panel")).toBeHidden();
  else await expect(page.locator(".aim-panel")).toBeVisible();
  await expect(page.locator("#power-meter")).toHaveCount(0);
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
  await page.waitForTimeout(300);
  await page.keyboard.down("Space");
  await expect(page.locator(".reticle-charge")).toBeVisible();
  await expect
    .poll(
      async () =>
        parseFloat(
          await page
            .locator(".reticle-charge")
            .getAttribute("stroke-dasharray"),
        ),
      { timeout: 5000 },
    )
    .toBeGreaterThan(10);
  await page.keyboard.up("Space");
});
for (const weapon of ["mortar", "sticky"])
  test(`${weapon} fires with its own impact behavior`, async ({ page }) => {
    await page.goto("/");
    await page.locator("#mode").selectOption("local");
    await page.locator("#start").click();
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

test("active worm label and labels avoid the aim reticle", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#aim-reticle")).toBeVisible();
  await expect(page.locator(".worm-label.active")).toHaveCount(1);
  await expect(page.locator(".worm-label.active")).toContainText("Sprout");
  expect(await page.evaluate(() => window.siege.getState().activeWorm)).toBe(
    "Sprout",
  );
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => {
      const match = document
        .querySelector("#aim-reticle")
        .getAttribute("transform")
        .match(/translate\(([-\d.]+),([-\d.]+)\)/);
      const x = +match[1],
        y = +match[2];
      return [...document.querySelectorAll(".worm-label")].some((element) => {
        const box = element.getBoundingClientRect();
        return x > box.left && x < box.right && y > box.top && y < box.bottom;
      });
    }),
  ).toBe(false);
  // Hard labels never get pushed out of the arena by the reticle.
  expect(
    await page.evaluate(() =>
      [...document.querySelectorAll(".worm-label")].every((element) => {
        const box = element.getBoundingClientRect(),
          arena = document.querySelector("#arena").getBoundingClientRect();
        return box.top >= arena.top - 1 && box.bottom <= arena.bottom + 1;
      }),
    ),
  ).toBe(true);
});

test("share and install metadata resolve to real assets", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    "content",
    /og-card\.png$/,
  );
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image",
  );
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    "href",
    "./manifest.webmanifest",
  );
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute(
    "href",
    "./art/apple-touch-icon.png",
  );
  const manifest = await page.evaluate(async () =>
    (await fetch("./manifest.webmanifest")).json(),
  );
  expect(manifest.name).toBe("Pocket Siege");
  expect(manifest.icons.map((icon) => icon.sizes)).toEqual([
    "192x192",
    "512x512",
  ]);
  expect(
    await page.evaluate(async () => {
      const [icon, card] = await Promise.all([
        fetch("./art/icon-192.png"),
        fetch("./art/og-card.png"),
      ]);
      return [icon.status, card.status];
    }),
  ).toEqual([200, 200]);
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
  expect(["health", "grenade", "mortar", "sticky"]).toContain(
    state.crate?.kind,
  );
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
}) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator("#angle").evaluate((el) => {
    el.value = "45";
    el.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await chargeShot(page, 1100);
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().camera.zoom), {
      timeout: 6000,
    })
    .toBeGreaterThan(1.02);
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
});

test("a proximity mine spends ammo, arms, and detonates", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await page.locator('[data-weapon="mine"]').click();
  await expect(page.locator("#fire-label")).toHaveText("PLACE MINE");
  await page.locator("#fire").click();
  let state = await page.evaluate(() => window.siege.getState());
  expect(state.mines).toHaveLength(1);
  expect(state.ammo[0].mine).toBe(1);
  expect(state.phase).toBe("settle");
  await expect
    .poll(() => page.evaluate(() => window.siege.getState().explosions), {
      timeout: 5000,
    })
    .toBeGreaterThan(0);
  state = await page.evaluate(() => window.siege.getState());
  expect(state.mines).toHaveLength(0);
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

test("a finished match enables the result card", async ({ page }) => {
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
});

test("saved settings survive a reload", async ({ page }) => {
  await page.goto("/");
  await page.locator("#difficulty").selectOption("veteran");
  await page.locator("#mode").selectOption("local");
  await page.selectOption("#format", "best3");
  await page.selectOption("#weather", "storm");
  await page.selectOption("#modifier", "low-gravity");
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
  await expect(page.locator("#sound")).toHaveAttribute("aria-pressed", "true");
});
