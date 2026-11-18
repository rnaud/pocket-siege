import resources from './string-resources.json' with {type:'json'};

// Resource identity is explicit: missing languages/blocks return empty, without
// inventing Win32 locale fallback rules. All imported strings fit Windows-1252.
export function originalResourceString(id, language = 1033) {
  const block = resources.languages[language]?.[(id >>> 4) + 1];
  return block === undefined ? '' : resources.blocks[block].strings[id & 15];
}
const extended = new Map(Array.from(
  '€\u0081‚ƒ„…†‡ˆ‰Š‹Œ\u008dŽ\u008f\u0090‘’“”•–—˜™š›œ\u009džŸ',
  (character, index) => [character.codePointAt(0), 128 + index],
));
export function originalResourceStringBytes(id, language = 1033) {
  return Uint8Array.from(Array.from(originalResourceString(id, language), character => {
    const code = character.codePointAt(0);
    if (code < 128 || (code >= 160 && code <= 255)) return code;
    const byte = extended.get(code);
    if (byte === undefined) throw new RangeError(`Resource ${id} cannot be encoded as Windows-1252`);
    return byte;
  }));
}
