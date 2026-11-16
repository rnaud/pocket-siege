// 004FA490, including its use of the currently equipped record for type 4.
export function nativeWeaponAnimation(record, current = record) {
  const type = record["0x68"],
    action = record["0x6c"],
    mode = record["0x70"];
  if (type === 1) {
    if (action === 2)
      return (
        { 653: 0x97, 654: 0xda, 658: 0xb6, 660: 0xbf, 662: 0xc8, 664: 0xd1 }[
          record["0x98"]
        ] ?? 0
      );
    return (
      {
        1: 0x1ee,
        3: 0x1bb,
        4: 0x227,
        5: 0x1fa,
        6: 0x209,
        7: 0x1cd,
        8: 0x1d6,
        9: 0x1c4,
        10: 0x215,
      }[action] ?? 0
    );
  }
  if (type === 2) {
    if (mode === 1) return 0x101;
    if (mode === 2)
      return (
        {
          614: 0x107,
          616: 299,
          617: 0x119,
          618: 0x11f,
          620: 0x125,
          626: 0x10d,
          627: 0x113,
          665: 0xef,
          668: 0xfb,
        }[record["0x98"] & 0xffff] ?? 0
      );
    if (mode === 3 && record["0x74"] === 0x29a) return 0xf5;
  }
  if (type === 3) return 0x17c;
  if (type === 4)
    return (
      {
        1: 0x191,
        2: 0xa4,
        3: 0x191,
        4: 0x191,
        5: 0xe3,
        6: 0x1df,
        8: 0x9a,
        9: 0x131,
        10: 0x185,
        11: 0x7a,
        13: 0x137,
        14: 0x164,
        15: 0x16d,
        16: 0x6e,
        17: 0x68,
        18: 0x194,
        19: 0xe3,
        20: 0x23f,
        21: 0xe3,
        22: 0xe3,
        23: 0xe3,
        24: 0xe3,
      }[current["0x6c"]] ?? 0
    );
  return 0;
}
