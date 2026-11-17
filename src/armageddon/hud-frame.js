import { fixedMultiply } from "./numeric.js";
import { nativeSin } from "./trig.js";
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
  paintNativeFrameRequests(canvas, width, height, nativeHUDFrame(width, height, fill, "#000000", "#9d9d9d"));
}
export function paintNativeFrameRequests(canvas, width, height, requests) {
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  for (const [kind, a, b, c, d, e] of requests) {
    const color = kind === "rect" ? e : kind === "pixel" ? c : d;
    ctx.fillStyle = color || "#000000";
    if (kind === "rect") ctx.fillRect(a, b, c - a, d - b);
    else if (kind === "horizontal") ctx.fillRect(a, c, b - a + 1, 1);
    else if (kind === "vertical") ctx.fillRect(a, b, 1, c - b + 1);
    else if (color === 0) ctx.clearRect(a, b, 1, 1);
    else ctx.fillRect(a, b, 1, 1);
  }
}
export function paintNativeTeamHealth(canvas, fraction, color) {
  const amount = Math.imul(fraction, 100) >> 16;
  if (canvas.dataset.nativeHealth === String(amount) && canvas.dataset.nativeColor === color) return;
  // 004B8350 takes the standard font's 16px height; 004B87B0 adds one.
  paintNativeHUDFrame(canvas, amount + 4, 17, color);
  canvas.style.width = `${canvas.width}px`;
  canvas.style.height = "17px";
  canvas.dataset.nativeHealth = String(amount);
  canvas.dataset.nativeColor = color;
}

// 004EC470 / 004EC5D0 / 004EC5F0: fixed 50Hz team panel controller.
export function nativeTeamPanelTick(panel) {
  if (panel.countdown !== 0 && --panel.countdown === 0) panel.target = 0;
  const difference = (panel.target - panel.progress) | 0;
  const sign = difference >> 31;
  if (((difference ^ sign) - sign | 0) < 0x199a) panel.progress = panel.target;
  else {
    if (panel.progress < panel.target) panel.progress = (panel.progress + 0xccc) | 0;
    if (panel.target < panel.progress) panel.progress = (panel.progress - 0xccc) | 0;
  }
}
export function showNativeTeamPanel(panel) {
  panel.target = 65536;
  return panel.progress === 65536;
}
export function hideNativeTeamPanelAfterInput(panel) {
  if (panel.countdown === 0) panel.countdown = 50;
}

// 004EC350: animate the minimum visibility, then consume Shift+Delete.
export function nativeTeamPanelVisibilityTick(state, toggle = false) {
  const target = state.forced ? 65536 : 0;
  const difference = (target - state.minimum) | 0;
  const sign = difference >> 31;
  if (((difference ^ sign) - sign | 0) < 0xccd) state.minimum = target;
  else {
    if (state.minimum < target) state.minimum = (state.minimum + 0xccc) | 0;
    if (target < state.minimum) state.minimum = (state.minimum - 0xccc) | 0;
  }
  if (toggle) state.forced ^= 1;
}

// 004B8580, including the real 004C2BC0/004C2C00 team-store sums.
// Damage remains in the bar until event 0x42c clears each worm's damage total.
export function nativeTeamHealthTick(value, roster, maximum, surrendered = false) {
  let hp = 0, damage = 0;
  for (const worm of roster) {
    hp = (hp + worm.hp) | 0;
    if (!surrendered) damage = (damage + worm.damageTaken) | 0;
  }
  const target = Math.trunc(((hp + damage) << 16) / maximum) | 0;
  const difference = (target - value) | 0;
  const sign = difference >> 31;
  const busy = difference !== 0;
  if (((difference ^ sign) - sign | 0) > 0x28f)
    value = (value + (difference < 0 ? -0x28f : 0x28f)) | 0;
  else value = target;
  return { value, target, busy };
}

// 004B87B0: selected team switches both its name and bar to white every 25 ticks.
export function nativeTeamHighlight(color, selected, tick) {
  const flashing = Boolean(selected && (Math.trunc((tick | 0) / 25) & 1));
  return { flashing, font: flashing ? 15 : (color + 9) | 0 };
}

// 004EFBC0: list state. The host has one team per alliance, hence one row
// per root child; native multi-team alliance nesting is not yet integrated.
export function createNativeTeamList(order = [0, 1]) {
  return { order: [...order], swap: -1, swapProgress: 0, removal: 0,
    removeIndex: -1, drop: 0, velocity: 0, quick: 1 };
}
// 004F0060 / 004F00C0: stable descending order, one adjacent swap at a time.
export function nativeTeamListNeedsSort(list, scores) {
  return list.order.some((id, i) => i + 1 < list.order.length && scores[id] < scores[list.order[i + 1]]);
}
export function sortNativeTeamList(list, scores) {
  if (list.removal) return false;
  if (list.swap >= 0) return true;
  const index = list.order.findIndex((id, i) => i + 1 < list.order.length && scores[id] < scores[list.order[i + 1]]);
  if (index < 0) return false;
  list.swap = index;
  list.swapProgress = 0;
  return true;
}
// 004F0160 / 004F0190: eliminated rows leave from the bottom after sorting.
export function removeNativeTeamListRow(list, scores) {
  if (list.swap >= 0) return false;
  if (list.removal) return true;
  if (!list.order.length || scores[list.order.at(-1)] !== 0) return false;
  list.removal = 1;
  list.drop = list.velocity = 0;
  list.removeIndex = list.order.length - 1;
  return true;
}
// 004EFC50. Returns bounce requests; team/alliance lists set quick=1.
export function nativeTeamListTick(list) {
  const bounces = [];
  if (list.swap >= 0) {
    list.swapProgress = (list.swapProgress + 0xf5c) | 0;
    if (list.swapProgress > 65535) {
      const i = list.swap;
      [list.order[i], list.order[i + 1]] = [list.order[i + 1], list.order[i]];
      list.swap = -1;
      list.swapProgress = 0;
    }
  }
  if (list.removal === 1 || list.removal === 2) {
    list.velocity = (list.velocity + 0x20c) | 0;
    list.drop = (list.drop + list.velocity) | 0;
    if (list.drop > 65535) {
      if (list.removal === 1) {
        list.removal = 2;
        list.drop = list.velocity = 0;
      } else {
        if (!list.quick && list.removeIndex !== 0) bounces.push(Math.abs(list.velocity));
        list.drop = 65536;
        list.velocity = -Math.trunc(Math.imul(list.velocity, 3) / 4) | 0;
        if (Math.abs(list.velocity) < 0x28f || list.quick === 1) {
          list.order.splice(list.removeIndex, 1);
          list.removal = 0;
        }
      }
    }
  }
  return bounces;
}
// 004EFDA0 with the native 16px row height and one team per alliance.
export function nativeTeamListRows(list) {
  const height = 16 << 16;
  const collapse = list.removal === 2 ? fixedMultiply(16, list.drop) << 16 : 0;
  return list.order.flatMap((id, index) => {
    if (list.removal === 2 && list.removeIndex === index) return [];
    let x = 0, y = (index * height + collapse) | 0;
    if (index === list.swap || index === list.swap + 1 && list.swap >= 0) {
      const first = index === list.swap;
      const sign = (list.swap & 1) ? -1 : 1;
      x = fixedMultiply(nativeSin(Math.trunc(list.swapProgress / 2)), height * sign * (first ? 1 : -1));
      y = (y + fixedMultiply(height, list.swapProgress) * (first ? 1 : -1)) | 0;
    } else if (list.swap < 0 && list.removal === 1 && list.removeIndex === index) {
      y = (y + Math.imul(list.drop, (list.order.length - index) * 16)) | 0;
    }
    return [{ id, x, y }];
  });
}
