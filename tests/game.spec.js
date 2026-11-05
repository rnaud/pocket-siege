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
  await page.waitForTimeout(200);
  await page.keyboard.up("ArrowUp");
  expect(Number(await page.locator("#angle").inputValue())).toBeGreaterThan(45);
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
  await page.waitForTimeout(350);
  await page.keyboard.up("ArrowRight");
  expect(
    await page.evaluate(() => window.siege.getState().worms[0].x),
  ).toBeGreaterThan(before + 3);
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
  await page.waitForTimeout(200);
  await page.keyboard.up("w");
  expect(Number(await page.locator("#angle").inputValue())).toBeGreaterThan(
    before,
  );
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
  await page.waitForTimeout(400);
  await expect(page.locator(".reticle-charge")).toBeVisible();
  const dash = await page
    .locator(".reticle-charge")
    .getAttribute("stroke-dasharray");
  expect(parseFloat(dash)).toBeGreaterThan(10);
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

test("active worm ring and labels avoid the aim reticle", async ({ page }) => {
  await page.goto("/");
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect(page.locator("#aim-reticle")).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.siege
          .getState()
          .worms.filter((w) => w.ringVisible)
          .map((w) => w.name),
      ),
    )
    .toEqual(["Sprout"]);
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
