import { test, expect } from "@playwright/test";

test("landing adapter selects native strips and completes on simulation ticks", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const {
      loadOriginalArt,
      startOriginalLanding,
      stepOriginalLanding,
      originalWormFrame,
    } = await import("/src/armageddon/art.js");
    await loadOriginalArt();
    return [299.99, 300].map((speed) => {
      const worm = { hp: 100, ground: true, hurt: 0, frozen: 0 };
      const started = startOriginalLanding(worm, speed);
      const first = originalWormFrame(worm, "idle", 0, 45, "rocket", false);
      const afterRender = originalWormFrame(
        worm,
        "idle",
        1000,
        45,
        "rocket",
        false,
      );
      let ticks = 0,
        last;
      while (worm.originalLanding && ticks < 100) {
        last = originalWormFrame(worm, "idle", ticks, 45, "rocket", false);
        stepOriginalLanding(worm);
        ticks++;
      }
      const done = originalWormFrame(worm, "idle", ticks, 45, "rocket", false);
      return {
        started: !!started,
        first: first.name,
        renderStable: first.index === afterRender.index,
        lastFrame: last.index,
        ticks,
        done: done.name,
      };
    });
  });
  expect(result).toEqual([
    {
      started: true,
      first: "wland1",
      renderStable: true,
      lastFrame: 5,
      ticks: 13,
      done: "wbrth1",
    },
    {
      started: true,
      first: "wland2",
      renderStable: true,
      lastFrame: 8,
      ticks: 19,
      done: "wbrth1",
    },
  ]);
});

test("landing playback yields to movement, damage, freezing and weapon actions", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const { loadOriginalArt, startOriginalLanding, stepOriginalLanding } =
      await import("/src/armageddon/art.js");
    await loadOriginalArt();
    return [
      { moving: true },
      { ground: false },
      { hurt: 0.5 },
      { hp: 0 },
      { frozen: 1 },
      { knocked: true },
      { originalPreparation: {} },
      { originalRecoil: {} },
    ].map((change) => {
      const worm = { hp: 100, ground: true, hurt: 0 };
      startOriginalLanding(worm, 300);
      Object.assign(worm, change);
      stepOriginalLanding(worm);
      return worm.originalLanding === null;
    });
  });
  expect(result).toEqual(Array(8).fill(true));
});

test("live jump returns through the recovered landing animation", async ({
  page,
}) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => window.siege?.getState().assetsReady))
    .toBe(true);
  await page.locator("#mode").selectOption("local");
  await page.locator("#start").click();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = window.siege.getState();
        return s.worms[s.current].ground;
      }),
    )
    .toBe(true);
  const sprites = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const index = window.siege.getState().current;
        const seen = new Set();
        let airborne = false;
        const deadline = performance.now() + 5000;
        function sample() {
          const w = window.siege.getState().worms[index];
          airborne ||= !w.ground;
          if (airborne) seen.add(w.originalSprite);
          if (
            seen.has("wland1") ||
            seen.has("wland2") ||
            performance.now() >= deadline
          )
            resolve([...seen]);
          else requestAnimationFrame(sample);
        }
        document.querySelector("#jump").click();
        requestAnimationFrame(sample);
      }),
  );
  expect(sprites.some((name) => name === "wland1" || name === "wland2")).toBe(
    true,
  );
});

test("jump playback follows velocity through the native apex queue and backflip strip", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const {
      loadOriginalArt,
      startOriginalJump,
      stepOriginalJump,
      originalWormFrame,
    } = await import("/src/armageddon/art.js");
    await loadOriginalArt();
    const worm = { hp: 100, ground: false, vy: 140, hurt: 0 };
    startOriginalJump(worm);
    const frame = () =>
      originalWormFrame(worm, "panic", 1000, 45, "rocket", false).name;
    const rising = frame();
    for (let i = 0; i < 10; i++) stepOriginalJump(worm);
    const stillRising = frame();
    worm.vy = 0;
    stepOriginalJump(worm);
    const apex = frame();
    worm.vy = -1;
    stepOriginalJump(worm);
    const firstDescent = frame();
    const sequence = [];
    for (let i = 0; i < 50; i++) {
      stepOriginalJump(worm);
      sequence.push(frame());
    }
    const linked = sequence.includes("wflylnk");
    const falling = frame();
    const pending =
      (worm.originalJump.write - worm.originalJump.read + 16) % 16;
    startOriginalJump(worm, true);
    const backflip = frame();
    worm.knocked = true;
    stepOriginalJump(worm);
    return {
      rising,
      stillRising,
      apex,
      firstDescent,
      linked,
      falling,
      pending,
      backflip,
      cancelled: worm.originalJump === null,
    };
  });
  expect(result).toEqual({
    rising: "wflyup",
    stillRising: "wflyup",
    apex: "wflyup",
    firstDescent: "wflyup",
    linked: true,
    falling: "wflydn",
    pending: 0,
    backflip: "wbackflp",
    cancelled: true,
  });
});

test("landing sound uses the original sample and recovered impact strength", async ({
  page,
}) => {
  const requested = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/wormlanding.wav"))
      requested.push(request.url());
  });
  await page.goto("/");
  await page.evaluate(async () => {
    const { loadOriginalArt, startOriginalLanding } =
      await import("/src/armageddon/art.js");
    const { playNativeLandingSound } = await import("/src/armageddon/audio.js");
    await loadOriginalArt();
    const context = new AudioContext();
    const source = context.createBufferSource.bind(context),
      gain = context.createGain.bind(context);
    const gains = [];
    window.landingAudio = [];
    context.createGain = () => {
      const node = gain();
      gains.push(node);
      return node;
    };
    context.createBufferSource = () => {
      const node = source(),
        start = node.start.bind(node);
      node.start = () => {
        window.landingAudio.push({
          gain: gains.at(-1).gain.value,
          duration: node.buffer.duration,
        });
        start();
      };
      return node;
    };
    for (const speed of [100, 200, 800])
      playNativeLandingSound(context, startOriginalLanding({ hp: 100 }, speed));
  });
  await expect
    .poll(() => page.evaluate(() => window.landingAudio.length))
    .toBe(3);
  expect(requested).toHaveLength(1);
  const audio = await page.evaluate(() => window.landingAudio);
  expect(audio.every((item) => item.duration > 0)).toBe(true);
  expect(audio[0].gain).toBeCloseTo(0.0875);
  expect(audio[1].gain).toBeCloseTo(0.175);
  expect(audio[2].gain).toBeCloseTo(0.35);
});
