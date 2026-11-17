// Original004F9600: firing from states77/79/7A/7E. This differs from the
// immediate dispatcher: only selected utilities are allowed, plus rope and
// subtype12. State entry, launch tasks and world flags remain interfaces.
export function nativeTraversalFire(input, weaponRecord, interfaces = {}) {
  const body = { ...input }, record = { ...weaponRecord }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, record, extra);
  };
  const done = (result = 0) => ({ body, record, result: result | 0, calls });
  if (!body.weapon || !body.enabled) return done();
  if (record['0x68'] === 2) {
    invoke('beginAction'); return done(invoke('placed'));
  }
  if (record['0x68'] !== 4) return done();
  const subtype = record['0x6c'];
  if ([1, 3, 4, 8, 19].includes(subtype)) {
    invoke('beginAction'); return done(invoke('utility'));
  }
  if (subtype === 6) {
    if (!body.ropeFiring && !body.ropeActive) {
      let rope = invoke('weaponRecord', { slot: 37 });
      let minimum = 0x3333;
      if (((rope['0x70'] >>> 16) & 255) !== 0) {
        rope = invoke('weaponRecord', { slot: 37 });
        minimum = ((rope['0x70'] >>> 16) & 255) === 1 ? 0x8000 : 0xc000;
      }
      body.aim = Math.max(minimum, Math.min(65536, body.aim));
      invoke('beginAction');
      const direction = body.facing < 0 ? (0x20000 - body.aim) | 0 : body.aim;
      rope = invoke('weaponRecord', { slot: 37 });
      invoke('continueAction');
      if (!body.ropeActive) {
        const count = (rope['0x70'] << 24) >> 24;
        body.ropeRemaining = count < 0 ? count : count + 1;
      }
      body.ropeProgress = 0;
      body.ropeFiring = 1;
      body.ropeLength = Math.trunc(((rope['0x70'] >>> 8) & 255) * 420 / 100);
      body.ropeAngle = Math.trunc(direction / 2);
      invoke('sound', { request: [86, 3, 65536, 65536, 0] });
    }
    return done(1);
  }
  if (subtype === 12) {
    invoke('beginAction');
    body.field27c = body.power = 0;
    body.field2a4 = body.field2a8 = 1;
    body.state = 0x7d;
    invoke('state', { value: 0x7d });
    body.shots = (body.shots + 1) | 0;
    const request = invoke('launchSetup', { value: 0 });
    invoke('launch', { request });
    invoke('finish');
    return done(1);
  }
  return done();
}
