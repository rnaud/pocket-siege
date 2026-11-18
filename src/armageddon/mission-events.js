//00440EB0: build the original timed-event and sequence buffers. Profile reads
//and localized CString resources remain platform services; text is byte data.
export function nativeLoadMissionEvents(memory, owner, host) {
  const short = (address, value) => {
    memory.putByte(address, value);
    memory.putByte(address + 1, value >>> 8);
  };
  for (const timed of [true, false]) {
    const counter = timed ? 0x6eb018 : 0x6ef41c;
    const stride = timed ? 0x88 : 0x84;
    const payload = counter + (timed ? 12 : 8);
    const count = () => memory.get(counter) & 65535;
    const address = offset => payload + count() * stride + offset;
    let section = `${timed ? 'Event' : 'Sequence'}0001`;
    const read = (key, fallback = 0) => host.profileInt(section, key, fallback, memory.get(owner + 0x880)) >>> 0;
    const field = (key, offset, fallback = 0, width = 4, mapped = false) => {
      let value = read(key, fallback);
      if (mapped) value = memory.get((owner + 0x888 + Math.imul(value, 4)) >>> 0);
      if (width === 2) short(address(offset), value);
      else memory.put(address(offset), value);
    };
    short(counter, 0);
    let end = read('EventEnd');
    for (let index = 1; !end && index <= 300; index++) {
      section = `${timed ? 'Event' : 'Sequence'}${String(index).padStart(4, '0')}`;
      const retries = read('Retries');
      if (retries <= (memory.get(owner + 0x87c) >>> 0)) {
        if (timed) field('Turn', -8);
        const id = read('TypeOfEvent');
        const type = memory.get((owner + 4 + Math.imul(id, 4)) >>> 0) >>> 0;
        memory.put(address(-4), type);
        let accepted = true;
        if (type === 1 || type === 2) {
          const prefix = type === 1 ? 'PlaceMine_' : 'PlaceDrum_';
          field(prefix + 'XPosition', 0, 0, 2);
          field(prefix + 'YPosition', 2, 0, 2);
          field(prefix + 'OnGround', 4);
        } else if (type >= 3 && type <= 5) {
          const prefix = type === 3 ? 'PlaceWeapon_' : type === 4 ? 'PlaceHealth_' : 'PlaceTarget_';
          field(prefix + 'Bonus_Points', 0);
          field(prefix + 'Bonus_TurnExtension', 4);
          field(prefix + 'XPosition', 8, 0, 2);
          field(prefix + 'YPosition', 10, 0, 2);
          if (type === 3) {
            field(prefix + 'Contents', 12, 1, 4, true);
            field(prefix + 'OnGround', 20);
            field(prefix + 'Marked', 24);
            field(prefix + 'Vital', 28);
            field(prefix + 'Ammo', 16, 1);
          } else if (type === 4) {
            if (timed) field(prefix + 'OnGround', 16);
            field(prefix + 'Health', 12, 15);
            if (!timed) field(prefix + 'OnGround', 16);
            field(prefix + 'Marked', 20);
            field(prefix + 'Vital', 24);
          } else {
            field(prefix + 'TargetType', 12, 0, 4, true);
            field(prefix + 'OnGround', 24);
            field(prefix + 'FallSpeed', 16);
            field(prefix + 'Marked', 28);
            memory.put(address(20), 0);
          }
        } else if (type === 7) {
          const index = read('Text_String_Index');
          const bytes = host.loadString(memory.get((owner + 0x698 + Math.imul(index, 4)) >>> 0));
          accepted = bytes.length < 128;
          if (accepted) {
            const dest = address(0);
            // sprintf("%s") stops at an embedded NUL, even if CString is longer.
            let i = 0;
            while (i < bytes.length && bytes[i]) memory.putByte(dest + i, bytes[i++]);
            memory.putByte(dest + i, 0);
          }
        } else if (timed && type === 14) field('SetEventTurn_TurnNumber', 0);
        else accepted = type === 6 || (timed ? type >= 8 && type <= 13 : type >= 15 && type <= 17);
        if (accepted) short(counter, count() + 1);
      }
      end = read('EventEnd');
    }
  }
}
