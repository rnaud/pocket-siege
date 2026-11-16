// 004FABA9..004FADDB. Voice lookup and playback remain supplied interfaces;
// the casing ID is returned for the separate original emission routine.
export function nativeLaunchAudio(record, body, voice = (team, slot) => slot) {
  const calls = [];
  let casing = 0;
  const sound = id => calls.push({ operation: "sound", request: [id,3,65536,65536,0] });
  const loop = id => calls.push({ operation: "loopSound", request: [id,65536,65536,0] });
  const type = record["0x68"], subtype = record["0x6c"];
  if (type === 1) {
    if (subtype === 1 || subtype === 4) {
      if (!body.loop) loop(subtype === 1 ? 0x1004e : 0x1004f);
      casing = 0x338;
    } else if ([2,3,7,10].includes(subtype)) {
      sound(subtype === 2 ? 0x49 : subtype === 10 ? 0x1d : 0x4b);
      calls.push({ operation: "stopLoop", request: [] });
    } else if (subtype === 5 || subtype === 6) {
      sound(subtype === 5 ? 0x50 : 0x52);
      casing = subtype === 5 ? 0x33c : 0x338;
    }
  } else if (type === 2) {
    if (!body.burst || body.ordinal === 1) {
      calls.push({ operation: "voice", request: [body.team,0x1d] });
      sound(voice(body.team,0x1d));
    }
  } else if (type === 4) {
    if (subtype === 2) sound(0x60);
    else if (subtype === 3) sound(record["0x70"]);
    else if (subtype === 4) sound(record["0x78"]);
    else if (subtype === 10 && !body.flag) sound(0x43);
    else if (subtype === 11 && !body.loop) loop(0x10035);
  }
  return { calls, casing };
}
