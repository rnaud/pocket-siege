// Deliberate fans prevent random clumps while keeping distinct weapon roles.
export function fragments(kind) {
  const count = kind === "mortar" ? 3 : kind === "cluster" ? 5 : 0;
  return Array.from({ length: count }, (_, i) => {
    const angle = ((35 + (i * 110) / Math.max(1, count - 1)) * Math.PI) / 180;
    const speed = kind === "mortar" ? 165 : 125;
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      fuse: kind === "mortar" ? 1.1 : 1.6,
      kind: kind === "mortar" ? "shrapnel" : "bomblet",
    };
  });
}
export function airstrikePattern(x, ground, direction, height, gravity) {
  return Array.from({ length: 5 }, (_, i) => {
    const y = height - 12 - i * 8,
      vy = -50,
      vx = direction * 90;
    const time =
      (vy + Math.sqrt(vy * vy + 2 * gravity * (y - ground))) / gravity;
    return { x: x + (i - 2) * 34 - vx * time, y, vx, vy };
  });
}
