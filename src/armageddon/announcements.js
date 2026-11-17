import elimination from "./elimination-announcements.json" with { type: "json" };
import { fixedMultiply } from "./numeric.js";
// Native 20-slot announcement ring (004EC6A0) and 50Hz controller (004ECA40).
// The historical `scale` field is pixel coverage, not geometric size.
// Native team visibility inputs remain a host adapter.
// `blocking` preserves the field name used by the oracle;
// 004EB800 consumes it for audio, while any pending queue delays turn flow.
export function createNativeAnnouncements() {
  return { read: 0, write: 0, stage: 0, elapsed: 0, scale: 0, blocking: 0,
    entries: Array(20).fill(null) };
}
export function queueNativeAnnouncement(state, text, font = 15, team = 0, teamOnly = 0) {
  if (text.startsWith("!")) {
    text = text.slice(1);
    state.write = state.read;
    state.stage = 0;
  }
  const next = (state.write + 1) % 20;
  if (next === state.read) return;
  state.entries[state.write] = { text: text.split("\0")[0].slice(0, 80),
    font: Math.abs(font | 0) | 0, long: Number(font < 0), team, teamOnly };
  state.write = next;
}
export function nativeAnnouncementTick(state) {
  const count = (state.write - state.read + 20) % 20;
  if (!count) return;
  let duration = count === 1 ? 1000 : count === 2 ? 875 : 750;
  if (state.stage && state.entries[state.read].long) duration *= 3;
  switch (state.stage) {
    case 0: state.stage = 1; state.scale = 0; break;
    case 1:
      state.scale = (state.scale + 0x4ccc) | 0;
      if (state.scale >= 65536) {
        state.stage = 2; state.scale = 65536; state.elapsed = 0;
      }
      break;
    case 2:
      state.elapsed = (state.elapsed + 20) | 0;
      if (state.elapsed <= duration) return;
      state.stage = 3;
      break;
    case 3:
      state.scale = (state.scale - 0x4ccc) | 0;
      if (state.scale <= 0) { state.stage = 0; state.read = (state.read + 1) % 20; }
      break;
  }
  state.blocking = state.stage ? state.entries[state.read].long : 0;
}

// 004AC953: retain a pixel when the unsigned accumulator addition carries.
// This is a coverage dissolve, not geometric scaling or alpha blending.
export function nativeAnnouncementMask(length, seed, coverage) {
  const mask = new Uint8Array(length);
  if (coverage >= 65536) { mask.fill(1); return mask; }
  if (coverage <= 0) return mask;
  const increment = (coverage << 16) >>> 0;
  let accumulator = seed >>> 0;
  for (let i = 0; i < length; i++) {
    const sum = accumulator + increment;
    mask[i] = Number(sum > 0xffffffff);
    accumulator = sum >>> 0;
  }
  return mask;
}

// 004C6894..004C698C: border drawn after the text at x=4.
export function nativeAnnouncementFrame(textWidth, textHeight, color) {
  const right = textWidth + 6, bottom = textHeight;
  return [
    ["horizontal", 1, right, 0, color], ["horizontal", 1, right, bottom, color],
    ["vertical", 0, 1, bottom, color], ["vertical", right, 1, bottom, color],
    ["pixel", 1, 1, color], ["pixel", right - 1, 1, color],
    ["pixel", 1, bottom - 1, color], ["pixel", right - 1, bottom - 1, color],
    ["pixel", 0, 0, 0], ["pixel", right, 0, 0],
    ["pixel", 0, bottom, 0], ["pixel", right, bottom, 0],
  ];
}

// 004EC930: visibility and center coordinates in the native screen space.
export function nativeAnnouncementDraw(state, screenHeight, playback = 0, teamVisible = true) {
  const entry = state.entries[state.read];
  if (!state.stage || !state.scale || !entry || (entry.teamOnly && !teamVisible)) return null;
  return { text: entry.text, font: entry.font, coverage: state.scale,
    x: 0, y: (Math.imul(playback, 10) - Math.trunc((screenHeight << 16) / 2) + 0x100000) | 0 };
}

// 004ECA20; 004B64B0 checks this before advancing the turn controller.
export function nativeAnnouncementsPending(state) {
  return state.read !== state.write;
}

// 004EB800 and 004EDA70; handle allocation is supplied by the audio backend.
export function nativeAnnouncementAudioTick(volume, handle, longMessage, startedHandle = 17) {
  const target = longMessage ? 65536 : 0;
  if (volume < target) volume = target;
  else {
    const difference = (target - volume) | 0;
    const increment = Math.max(0x1ca, Math.abs(fixedMultiply(difference, 0x1999)));
    volume = increment < Math.abs(difference)
      ? (volume + (volume <= target ? increment : -increment)) | 0 : target;
  }
  const calls = [];
  if (volume) {
    if (!handle) { calls.push(["play", 0x10001, 9, 65536, volume, 0]); handle = startedHandle; }
    else calls.push(["volume", handle, volume]);
  } else {
    if (handle) calls.push(["stop", handle]);
    handle = 0;
  }
  return { volume, handle, calls };
}

// 004EEEE0 chooses from the language table using one match-logic RNG draw;
// 004EC470 supplies the team name and color + 17 (medium team-color font).
export function nativeTeamEliminationAnnouncement(name, color, nextRandom) {
  const template = elimination.messages[(nextRandom() & 255) % elimination.messages.length];
  return { text: template.replace("%s", () => name), font: color + 17 };
}

// 004B4100 uses language slot +0x20 for a surviving team's victory;
// 004B64B0 uses slot +0x2C and font 23 when no teams survive.
export function nativeMatchResultAnnouncement(name, color, draw, nextRandom) {
  const variants = draw ? elimination.draw : elimination.victory;
  return { text: variants[(nextRandom() & 255) % variants.length].replace("%s", () => name),
    font: draw ? 23 : color + 17 };
}

// 004B64B0: language slot +0x34, medium white font, one logic RNG draw.
export function nativeSuddenDeathAnnouncement(nextRandom) {
  const variants = elimination.suddenDeath;
  return { text: variants[(nextRandom() & 255) % variants.length], font: 23 };
}

// 004C2C80 sums every roster member's match damage received, including dead
// worms. 004B4187..004B419F chooses the winning team's speech request.
export function nativeVictorySpeech(damageTotals) {
  const total = damageTotals.reduce((sum, damage) => (sum + damage) | 0, 0);
  return [total === 0 ? 17 : 51, 8, 65536, 65536, 0];
}

// 004DE639..004DE68E (death) / 004DE35A..004DE3AE (drowning).
// These run at removal, after death effects or leaving the playfield.
export function nativeWormDeathAnnouncement(name, color, drowned, nextRandom) {
  const variants = drowned ? elimination.drowning : elimination.death;
  return { text: variants[(nextRandom() & 255) % variants.length].replace("%s", () => name),
    font: color + 17 };
}

// 004B7D00: English language slots +0x2E8/+0x2EC/+0x2F0.
export function nativeCrateDropAnnouncement(kind, nextRandom) {
  const variants = kind === "health" ? elimination.healthDrop
    : kind === "utility" ? elimination.utilityDrop : elimination.weaponDrop;
  return { text: variants[(nextRandom() & 255) % variants.length], font: 23 };
}

// 004B5CA0 consumes004C2B80's per-worm kill counter before turn advancement.
// A missing damage source does not touch counters or consume randomness.
export function nativeKillAnnouncement(stats, name, color, nextRandom) {
  if (!stats) return null;
  const kills = stats.turnKills;
  stats.turnKills = 0;
  if (!kills) return null;
  const variants = elimination.kills[Math.min(15, kills)];
  return { text: variants[(nextRandom() & 255) % variants.length].replace("%s", () => name),
    font: color + 17 };
}

// Worm event439 uses English language+2F4 ->00558E78, font23.
export function nativePoisonAnnouncement(name, nextRandom) {
  const variants = elimination.poison;
  return { text: variants[(nextRandom() & 255) % variants.length].replace('%s', () => name), font: 23 };
}
