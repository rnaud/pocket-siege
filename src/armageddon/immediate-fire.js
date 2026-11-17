// Original004F9870: immediate-use fire routing. Charged projectile release is
// a separate path. Callbacks own the delegated action routines and may mutate
// body/record, as the native calls can; airstrikes recheck those values.
export function nativeImmediateFire(input, weaponRecord, interfaces = {}) {
  const body = { ...input }, record = { ...weaponRecord }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, record, extra);
  };
  const done = (result = 0) => ({ body, record, result: result | 0, calls });
  if (!body.weapon || !body.enabled) return done();
  switch (record['0x68']) {
    case 1:
      if (record['0x70'] !== 3) return done();
      invoke('beginAction');
      return done(invoke('projectile'));
    case 2:
      invoke('beginAction');
      return done(invoke('placed'));
    case 3: {
      invoke('beginAction');
      if (!body.weapon || !body.enabled || record['0x68'] !== 3) return done();
      body.field27c = 0;
      body.shots = (body.shots + 1) | 0;
      body.power = 0;
      body.field2a4 = body.field2a8 = 1;
      const request = invoke('launchSetup', { value: 0 });
      invoke('launch', { request });
      invoke('finish');
      return done(1);
    }
    case 4:
      if (![8, 10, 16, 17, 19, 21, 22, 24].includes(record['0x6c'])) return done();
      invoke('beginAction');
      return done(invoke('utility'));
    default:
      return done();
  }
}
