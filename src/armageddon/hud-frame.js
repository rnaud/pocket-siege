// 004B8660: original team/panel frame draw requests. Rectangle endpoints
// are exclusive; horizontal/vertical line endpoints are inclusive.
export function nativeHUDFrame(width, height, fill, black, edge) {
  return [
    ["rect", 0, 0, width, height, black],
    ["horizontal", 1, width - 1, 0, edge],
    ["horizontal", 1, width - 1, height - 1, edge],
    ["vertical", 0, 1, height - 1, edge],
    ["vertical", width - 1, 1, height - 1, edge],
    ["pixel", 1, 1, edge],
    ["pixel", width - 2, 1, edge],
    ["pixel", 1, height - 2, edge],
    ["pixel", width - 2, height - 2, edge],
    ["rect", 2, 2, width - 2, height - 2, fill],
    ["pixel", 2, 2, black],
    ["pixel", width - 3, 2, black],
    ["pixel", 2, height - 3, black],
    ["pixel", width - 3, height - 3, black],
    ["pixel", 0, 0, 0],
    ["pixel", width - 1, 0, 0],
    ["pixel", 0, height - 1, 0],
    ["pixel", width - 1, height - 1, 0],
  ];
}
export function paintNativeHUDFrame(canvas, width, height, fill) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  for (const [kind, a, b, c, d, e] of nativeHUDFrame(
    width,
    height,
    fill,
    "#000000",
    "#9d9d9d",
  )) {
    const color = kind === "rect" ? e : kind === "pixel" ? c : d;
    ctx.fillStyle = color || "#000000";
    if (kind === "rect") ctx.fillRect(a, b, c - a, d - b);
    else if (kind === "horizontal") ctx.fillRect(a, c, b - a + 1, 1);
    else if (kind === "vertical") ctx.fillRect(a, b, 1, c - b + 1);
    else if (color === 0) ctx.clearRect(a, b, 1, 1);
    else ctx.fillRect(a, b, 1, 1);
  }
}
export function paintNativeTeamHealth(canvas, hp, maxHp, color) {
  const amount = Math.max(0, Math.min(100, Math.floor((hp * 100) / maxHp)));
  // 004B8350 takes the standard font's 16px height; 004B87B0 adds one.
  paintNativeHUDFrame(canvas, amount + 4, 17, color);
  canvas.style.width = `${canvas.width * 2}px`;
  canvas.style.height = "34px";
  canvas.dataset.nativeHealth = String(amount);
}
