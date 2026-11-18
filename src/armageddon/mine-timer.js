import records from "./scheme-weapons.js";
import { WEAPON_SLOTS } from "./delays.js";
const record = records.schemes.find((s) => s.resource_id === 195).weapons[
  WEAPON_SLOTS.mine
];
const word = (offset) => record[(offset - 0x48) / 4];
//004E9512..004E95B9 initializes both placed and natural mines from this
// eight-word weapon record. Natural mines supply their scheme fuse directly.
export function nativeMineTimerFromRecord(record,placed) {
  return {enabled:1,triggered:0,radius:record[2]|0,fuse:record[3]|0,
    arm:record[1]|0,damage:record[6]|0,lastBeep:Math.trunc((record[3]|0)/250)|0,
    placed:placed|0,forceBlast:0,dud:0};
}
export function nativeMineInitialTimer() {
  return {
    arm: word(0x78),
    fuse: word(0x80),
    triggered: 0,
    lastBeep: Math.trunc(word(0x80) / 250),
    enabled: 1,
    radius: word(0x74),
  };
}
export const NATIVE_MINE_MASK = word(0x7c);
export const NATIVE_MINE_DAMAGE = word(0x8c);

// 004EA0F4..004EA499; expiry hands off to the separate dud/blast dispatch.
export function nativeMineTimer(previous, environment, proximity) {
  const body = { ...previous },
    calls = [];
  let expired = false;
  const arm = () => {
    calls.push({
      operation: "friction",
      request: [Math.trunc((environment.friction << 16) / 100)],
    });
    calls.push({ operation: "complex", request: [1] });
    body.arm = 0;
  };
  const sound = (id) =>
    calls.push({ operation: "sound", request: [id, 5, 65536, 65536, 0] });
  const speed = (Math.abs(environment.vx) + Math.abs(environment.vy)) | 0;
  const period = Math.max(1, 10 - ((speed << 2) >> 16));
  if (body.arm < 0) {
    if (!environment.awake && !environment.vx && !environment.vy) arm();
  } else if (body.arm > 0) {
    body.arm = (body.arm - 20) | 0;
    if (body.arm <= 0) arm();
  } else if (body.triggered && !environment.submerged) {
    body.fuse = (body.fuse - 20) | 0;
    if (body.fuse <= 0) expired = true;
    else if (Math.trunc(body.fuse / 250) !== body.lastBeep) {
      sound(89);
      body.lastBeep = Math.trunc(body.fuse / 250);
    }
  } else if (
    !environment.submerged &&
    environment.frame % period === 0 &&
    !body.triggered &&
    body.enabled
  ) {
    calls.push({ operation: "proximity", request: [body.radius] });
    if (proximity(body.radius)) {
      calls.push({ operation: "announce", request: [] });
      sound(88);
      body.triggered = 1;
    }
  }
  return { body, calls, expired };
}

// 004EA070 render event0x3EB: triggered fuse alternates sprites four times/sec.
export function nativeMineSprite(timer) {
  return timer.triggered && Math.trunc((timer.fuse << 2) / 1000) & 1
    ? "mineon"
    : "mineoff";
}
