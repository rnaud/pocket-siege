// Original004F9D90. Launch may change the worm state; native finish only
// follows when state is unchanged and the configured shot count is reached.
export function nativeUtilityFire(input, weaponRecord, interfaces = {}) {
  const body = { ...input }, record = { ...weaponRecord }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, record, extra);
  };
  const done = result => ({ body, record, result, calls });
  if (!body.weapon || !body.enabled || record['0x68'] !== 4) return done(0);
  body.field27c = body.power = 0;
  body.shots = (body.shots + 1) | 0;
  body.field2a4 = body.field2a8 = 1;
  const subtype = record['0x6c'];
  if ([1, 3, 4, 5, 10].includes(subtype)) {
    if (subtype === 3 && body.state === 0x79) {
      invoke('clear');
      invoke('queue', { sprite: 0x1a9 });
    }
    const sound = subtype === 10 ? 0x44 : invoke('voice', {
      request: [body.team, subtype === 1 ? 10 : subtype === 3 ? 15 : 28],
    });
    invoke('sound', { request: [sound, 3, 65536, 65536, 0] });
  }
  const state = body.state;
  const request = invoke('launchSetup', { value: 0 });
  invoke('launch', { request });
  if (body.state === state && body.shotLimit === body.shots) invoke('finish');
  return done(1);
}
