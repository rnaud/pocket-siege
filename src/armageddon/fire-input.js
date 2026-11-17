// Original004F9FA0: Fire-button routing by worm state. State-entry effects,
// action-world flags, speech and delegated firing remain caller interfaces.
export function nativeFireInput(input, weaponRecord, interfaces = {}) {
  const body = { ...input }, record = { ...weaponRecord }, calls = [];
  const invoke = (operation, extra = {}) => {
    calls.push({ operation, ...extra });
    return interfaces[operation]?.(body, record, extra);
  };
  const state = value => { body.state = value; invoke('state', { value }); };
  const sound = (operation, request) => invoke(operation, { request });
  const reset = () => { body.power = 0; body.field2a4 = body.field2a8 = 1; };
  switch (body.state) {
    case 100: case 101: case 102: case 103: {
      if (!body.weapon || !body.enabled) break;
      if (invoke('blocked', { request: [body.team, body.worm] })) break;
      if (record['0x68'] === 4) {
        if (record['0x6c'] === 6) {
          reset(); invoke('beginAction'); state(0x70); break;
        }
        if ([7, 12].includes(record['0x6c'])) break;
      }
      if (body.state !== 0x67) state(0x67);
      body.shots = (body.shots + 1) | 0;
      if (record['0x68'] !== 3 && body.weapon !== 0x24) invoke('camera');
      reset(); invoke('beginAction');
      switch (record['0x68']) {
        case 1: {
          const mode = record['0x70'];
          if (mode === 1 || mode === 2) {
            body.field2a8 = record['0x74']; state(0x69);
          } else if (mode === 3) {
            const random = invoke('random');
            const voice = invoke('voice', { request: [body.team, random & 0x10000 ? 14 : 52] });
            sound('speech', [voice, 65536, 65536, 0]);
            if (record['0x78']) {
              body.power = Math.trunc((record['0x78'] << 16) / 100) | 0;
              state(0x69);
            } else state(0x68);
          } else if (mode === 4) state(0x69);
          if (record['0x6c'] === 2) sound('localSound', [72, 65536, 65536, 0]);
          else if ([3, 7].includes(record['0x6c'])) sound('localSound', [74, 65536, 65536, 0]);
          break;
        }
        case 2: {
          if (record['0x6c']) body.field2a8 = body.field2d8;
          const mode = record['0x70'];
          if (mode === 2) {
            body.power = Math.trunc((record['0x78'] << 16) / 100) | 0; state(0x69);
          } else if (mode === 1 || mode === 3) { body.power = 0xccc; state(0x69); }
          break;
        }
        case 3: state(0x69); break;
        case 4:
          if ([1,2,3,4,5,8,9,10,11,13,14,15,16,17,18,19,20,21,22,23,24].includes(record['0x6c'])) state(0x69);
          break;
      }
      break;
    }
    case 0x6e: case 0x71: state(0x65); break;
    case 0x73:
      if (body.ropeActive && !body.ropeFiring && body.ropeRemaining) {
        const angle = body.ropeAngle;
        const rope = invoke('weaponRecord', { slot: 37 });
        invoke('continueAction');
        if (!body.ropeActive) {
          const count = (rope['0x70'] << 24) >> 24;
          body.ropeRemaining = count < 0 ? count : count + 1;
        }
        body.ropeAngle = angle;
        body.ropeProgress = 0;
        body.ropeFiring = 1;
        body.ropeLength = Math.trunc(((rope['0x70'] >>> 8) & 255) * 420 / 100);
        sound('sound', [86, 3, 65536, 65536, 0]);
      }
      break;
    case 0x77: case 0x79: case 0x7a: case 0x7e:
      if (!invoke('traversalFire')) sound('failureSound', [120, 8, 65536, 65536, 0]);
      break;
    case 0x78: case 0x7b: case 0x7c: case 0x7d:
      if (!invoke('immediateFire')) sound('failureSound', [120, 8, 65536, 65536, 0]);
      break;
  }
  return { body, record, calls };
}
