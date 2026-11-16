// Timer branch004E45ED..004E477A, after body motion. Native timers are
// milliseconds decremented by20 per50Hz tick. Expiration is observed on the
// following tick; delayed detonation can wait for the body to stop moving.
export function nativeProjectileTimer(input, environment) {
  const body = { ...input }, calls = [];
  const done = () => ({ body, calls });
  if (environment.submerged) return done();
  if (body.remaining) {
    body.remaining = (body.remaining - 20) | 0;
    if (body.remaining < 1) {
      body.remaining = 0;
      if (body.loopSound) {
        calls.push({ operation: "stopSound", request: [body.loopSound] });
        body.loopSound = 0;
      }
    }
    if (body.remaining < 800 && body.warningPending && !body.warningBlocked) {
      calls.push({ operation: "random" });
      const slot = ((environment.random() >>> 16) & 255) % 3;
      calls.push({ operation: "warning", request: [[0x2e, 0x30, 0x35][slot], (body.warningScale * 2) | 0] });
      body.warningPending = 0;
    }
    return done();
  }
  if (body.delay) {
    if (body.waitForRest && environment.awake) return done();
    body.delay = (body.delay - 20) | 0;
    if (body.delay < 1) body.delay = 0;
    if (!body.delayPlayed)
      calls.push({ operation: "sound", request: [body.delaySound, 4, 65536, 65536, 0] });
    body.delayPlayed = 1;
    return done();
  }
  if (body.mode === 3 && body.specialSprite && body.phase === 1)
    calls.push({ operation: "special", request: [] });
  else {
    body.state = 1;
    calls.push({ operation: "state", value: 1 });
  }
  return done();
}
