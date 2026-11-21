import { test, expect } from "@playwright/test";
import { advanceUntil, advanceFrames, chargeFor, fastForward, fixTerrainRandom, openArsenal, chargeShot, setAim, startCustomMatch } from "./helpers/game-sim.js";
import { startMatch } from "./helpers/match.js";
// Gameplay assertions need reproducible terrain: random original decorations
// can obstruct a replay shot or put a jump above a lethal drop.
test.beforeEach(fixTerrainRandom);
test("pixel HUD exposes aim and charge, W/S aim and walking keep fire stable", async ({
  page,
}, info) => {
  await startMatch(page);
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
    await startMatch(page);
    await openArsenal(page);
    await page.locator(`[data-weapon="${weapon}"]`).click();
    await setAim(page, "-60");
    const before = await page.evaluate(
      () => window.siege.getState().terrainPixels,
    );
    await chargeShot(page, 300);
    if (weapon === "sticky") {
      await advanceUntil(page, (s) => s.projectile?.stuck === true, { max: 500, label: "sticky stuck" });
      const p = await page.evaluate(() => window.siege.getState().projectile);
      expect(p.vx).toBe(0);
      expect(p.vy).toBe(0);
    }
    await advanceUntil(page, (s) => s.explosions > 0, { max: 1000, label: `${weapon} explosion` });
    expect(
      await page.evaluate(() => window.siege.getState().terrainPixels),
    ).toBeLessThan(before);
  });

test("limited weapons spend ammo and update their counts", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-mode="local"]').click();
  // Custom keeps the host kit; Classic duel starts with the original default kit.
  await page.selectOption("#scheme", "custom");
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
  await page.locator('[data-mode="ai"]').click();
  await expect(page.locator("#difficulty-row")).toBeVisible();
  await page.selectOption("#difficulty", "veteran");
  await page.locator("#start").click();
  expect(await page.evaluate(() => window.siege.getState().difficulty)).toBe(
    "veteran",
  );
  await page.locator("#restart").click();
  await page.locator('[data-mode="local"]').click();
  await expect(page.locator("#difficulty-row")).toBeHidden();
});

test("worm labels retain original world anchors while aiming", async ({ page }) => {
  await startMatch(page, { map: "fern" });
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
