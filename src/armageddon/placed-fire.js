// Original004F9C30: placed weapons (type2), including repeated placement.
// The launch callback can change selection/state before the native rechecks.
export function nativePlacedFire(input, weaponRecord, interfaces = {}) {
  const body = { ...input }, record = { ...weaponRecord }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, record, extra);
  };
  const done = result => ({ body, record, result, calls });
  if (!body.weapon || !body.enabled || record['0x68'] !== 2) return done(0);
  body.field27c = body.power = 0;
  body.field2a4 = body.field2a8 = 1;
  body.shots = (body.shots + 1) | 0;
  if (record['0x6c']) body.field2a8 = body.field2d8;
  body.power = nativePlacedPower(record);
  const request = invoke('launchSetup', { value: 0 });
  invoke('launch', { request });
  if (body.weapon && record['0x68'] === 2 && record['0x6c']) {
    body.field2e8 = body.weapon;
    body.field2dc = 2;
    body.field2e4 = 500;
    body.field2e0 = body.field2d8;
  }
  if (body.field2a8 === 1) invoke('finish');
  return done(1);
}

export function nativePlacedPower(record) {
  const mode = record['0x70'];
  if (mode === 2) return Math.trunc((record['0x78'] << 16) / 100) | 0;
  return mode === 1 || mode === 3 ? 0xccc : 0;
}
