// 004EB460. Native progress is signed16.16, advanced at50Hz.
// Sound handles come from the supplied playback interface, including failures.
export function nativeNuclearEffectTick(input, play = () => 0) {
  const body = { ...input }, calls = [];
  if (body.progress < 0) body.target = 0;
  else {
    body.busy = 12;
    const triangle = body.progress > 32767 ? (65536 - body.progress) | 0 : body.progress;
    body.flash = (triangle * 2) | 0;
    body.target = (body.flash + 0x3333) | 0;
    body.fade = Math.max(0, Math.min(65536, (Math.imul(body.progress, -3) + 65536) | 0));
    const divisor = Math.imul(body.duration, 50);
    if (!divisor) throw new RangeError('Native nuclear duration divides by zero');
    body.progress = (body.progress + Math.trunc(65536 / divisor)) | 0;
    if (body.progress > 65535) { body.progress = -1; body.fade = 0; }
  }
  if (body.volume < body.target) body.volume = (body.volume + 0xccc) | 0;
  if (body.target < body.volume) {
    body.volume = (body.volume - 0xccc) | 0;
    if (body.volume === 0) body.shake = 0;
  }
  body.volume = Math.max(0, Math.min(65536, body.volume));
  for (const [field, sound] of [['handleA', 0x10004], ['handleB', 0x10005]]) {
    const handle = body[field];
    if (body.volume) {
      if (handle) calls.push({ operation: 'volume', handle, volume: body.volume });
      else {
        const request = [sound, 10, 65536, body.volume, 0];
        body[field] = play(request);
        calls.push({ operation: 'play', request, handle: body[field] });
      }
    } else {
      if (handle) calls.push({ operation: 'stop', handle });
      body[field] = 0;
    }
  }
  if (body.volume) body.shake = body.volume << 3;
  return { body, calls };
}
