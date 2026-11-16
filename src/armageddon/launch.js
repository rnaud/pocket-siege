import { nativeSin, nativeCos } from "./trig.js";

// 004FAF90. Coordinates and direction are signed 16.16 in native screen axes.
// Position getter, terrain and gameplay RNG remain explicit caller inputs.
export function nativeLaunch(
  record,
  {
    x,
    y,
    angle,
    facing,
    preview = false,
    targetX = 0,
    vx = 0,
    vy = 0,
    random = () => 0,
    solid = () => false,
  },
) {
  const type = record["0x68"],
    action = record["0x6c"];
  let direction = facing < 0 ? (0x20000 - angle) | 0 : angle | 0;
  const aim = (value) => {
    const half = Math.trunc(value / 2);
    vx = nativeSin(half);
    vy = nativeCos(half);
  };
  const offset = (distance) => {
    x = (x + Math.imul(vx, distance)) | 0;
    y = (y + Math.imul(vy, distance)) | 0;
  };
  if (type === 1) {
    if (!preview) {
      const draw = random();
      if (record["0x70"] === 2)
        direction =
          (direction +
            Math.trunc(
              Math.imul(record["0x7c"], (draw & 0xffff) - 0x8000) / 360,
            )) |
          0;
    }
    aim(direction);
    if ([3, 7].includes(action)) offset(14);
    else if (action === 10) offset(6);
    else if (action === 9) {
      x = (x + Math.imul(facing, 0x30000)) | 0;
      let distance = 0;
      for (; distance < 8; distance++) {
        if (
          solid(
            ((Math.imul(vx, distance) + x) | 0) >> 16,
            ((Math.imul(vy, distance) + y) | 0) >> 16,
          )
        )
          break;
      }
      offset(distance);
    }
  } else if (type === 2) aim(facing < 0 ? 0x13334 : 0xcccc);
  else if (type === 3) {
    vx = targetX << 16;
    vy = 0;
  } else if (type === 4) {
    if ([2, 4, 6, 11].includes(action)) aim(direction);
    else if (action === 3) {
      x = (x + Math.imul(facing, 0x40000)) | 0;
      y = (y - 0x30000) | 0;
      vx = facing << 16;
      vy = 0;
    } else if (action === 1 || (action >= 5 && action <= 24)) {
      vx = 0;
      vy = 0;
    }
  }
  return { x, y, vx, vy };
}
