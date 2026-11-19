import { nativeLoadMissionEvents } from './mission-events.js';

// Owner table +4: profile TypeOfEvent -> internal event type (00440EB0).
export const MISSION_EVENT_TYPES = [0, 3, 4, 5, 8, 9, 10, 11, 15, 16, 7, 19, 14, 1, 2, 17, 6];
const OWNER = 0x2000000, OWNER_SIZE = 0x1000;
const SETUP = 0x6e0000, SETUP_SIZE = 0x20000;
const TIMED = 0x6eb018, TIMED_STRIDE = 0x88;
const SEQUENCE = 0x6ef41c, SEQUENCE_STRIDE = 0x84;
const TEXT_TABLE = 0x698, TEXT_ENTRIES = (0x888 - TEXT_TABLE) / 4, TEXT_TAG = 0x40000000;

function missionMemory() {
  const setup = new DataView(new ArrayBuffer(SETUP_SIZE));
  const owner = new DataView(new ArrayBuffer(OWNER_SIZE));
  const region = address => {
    address >>>= 0;
    if (address >= SETUP && address < SETUP + SETUP_SIZE) return [setup, address - SETUP];
    if (address >= OWNER && address < OWNER + OWNER_SIZE) return [owner, address - OWNER];
    throw new RangeError(`Mission loader address ${address.toString(16)} is outside the adapter`);
  };
  return {
    get: address => { const [view, offset] = region(address); return view.getUint32(offset, true); },
    put: (address, value) => { const [view, offset] = region(address); view.setUint32(offset, value >>> 0, true); },
    byte: address => { const [view, offset] = region(address); return view.getUint8(offset); },
    putByte: (address, value) => { const [view, offset] = region(address); view.setUint8(offset, value & 255); },
    s16: address => { const [view, offset] = region(address); return view.getInt16(offset, true); },
    s32: address => { const [view, offset] = region(address); return view.getInt32(offset, true); },
    u16: address => { const [view, offset] = region(address); return view.getUint16(offset, true); },
  };
}

function profileReader(record) {
  // GetPrivateProfileInt: case-insensitive section/key, first matching key.
  return (section, key, fallback) => {
    const entries = record.sections.find(s => s.name.toLowerCase() === section.toLowerCase())?.entries;
    const value = entries?.find(([k]) => k.toLowerCase() === key.toLowerCase())?.[1];
    if (value === undefined) return fallback;
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : 0;
  };
}

function decodeEvent(memory, base, timed) {
  const type = memory.get(base - 4);
  const event = { type };
  if (timed) event.turn = memory.s32(base - 8);
  if (type === 1 || type === 2) {
    Object.assign(event, { x: memory.s16(base), y: memory.s16(base + 2), onGround: memory.s32(base + 4) });
  } else if (type >= 3 && type <= 5) {
    Object.assign(event, {
      points: memory.s32(base), seconds: memory.s32(base + 4),
      x: memory.s16(base + 8), y: memory.s16(base + 10),
    });
    if (type === 3) Object.assign(event, {
      content: memory.s32(base + 12), ammo: memory.s32(base + 16), onGround: memory.s32(base + 20),
      marked: memory.s32(base + 24), vital: memory.s32(base + 28),
    });
    else if (type === 4) Object.assign(event, {
      health: memory.s32(base + 12), onGround: memory.s32(base + 16),
      marked: memory.s32(base + 20), vital: memory.s32(base + 24),
    });
    // The loader never writes a target Vital field (its slot stays zero).
    else Object.assign(event, {
      targetType: memory.s32(base + 12), fallSpeed: memory.s32(base + 16),
      fuseSeconds: memory.s32(base + 20), onGround: memory.s32(base + 24),
      marked: memory.s32(base + 28), vital: 0,
    });
  } else if (type === 7) {
    let text = '';
    for (let i = 0; i < 128; i++) {
      const byte = memory.byte(base + i);
      if (!byte) break;
      text += String.fromCharCode(byte);
    }
    event.text = text;
  } else if (type === 14) event.eventTurn = memory.s32(base);
  return event;
}

// Runs the recovered 00440EB0 loader against an isolated setup block and
// returns its timed and sequence records. attempts is the mission's failed
// attempt count (owner +0x87c), which the Retries filter compares against.
export function loadMissionScript(record, { attempts = 0, text = () => '' } = {}) {
  const memory = missionMemory();
  MISSION_EVENT_TYPES.forEach((type, id) => memory.put(OWNER + 4 + id * 4, type));
  // Contents and TargetType keep their profile numbering for the host adapter.
  for (let id = 0; (0x888 + id * 4) < OWNER_SIZE - 4; id++) memory.put(OWNER + 0x888 + id * 4, id);
  for (let index = 0; index < TEXT_ENTRIES; index++) memory.put(OWNER + TEXT_TABLE + index * 4, TEXT_TAG | index);
  memory.put(OWNER + 0x87c, attempts >>> 0);
  const read = profileReader(record);
  const encoder = new TextEncoder();
  nativeLoadMissionEvents(memory, OWNER, {
    profileInt: (section, key, fallback) => read(section, key, fallback),
    loadString: address => {
      const value = text((address & ~TEXT_TAG) >>> 0) ?? '';
      return Uint8Array.from(encoder.encode(value).map(byte => byte));
    },
  });
  const list = (counter, stride, offset, timed) => {
    const count = memory.u16(counter);
    return Array.from({ length: count }, (_, i) => decodeEvent(memory, counter + offset + i * stride, timed));
  };
  return {
    timed: list(TIMED, TIMED_STRIDE, 12, true),
    sequence: list(SEQUENCE, SEQUENCE_STRIDE, 8, false),
  };
}
