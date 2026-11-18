//004E5380: shared by fresh construction and replay restoration.
export function nativeInitializeControllerResources(memory,options) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const get=o=>view.getInt32(o,true),put=(o,v)=>view.setInt32(o,v,true);
    const portrait = options.allocateResource(0x170);
    put(0x110, portrait ? options.constructPortrait(portrait, options.context, get(0x3c)) : 0);
    put(0x118, 0);
    const frame = options.allocateResource(0x3c);
    put(0x114, frame ? options.constructFrame(frame, options.context + 0x2b0, 8, 2, 2, 30, 30, options.palette[7], options.palette[8]) : 0);
    const text = options.allocateResource(0x138);
    put(0x11c, text ? options.constructText(text, options.renderer, 23, 480) : 0);
    for (const offset of [0xcc, 0xd0, 0xac, 0xbc, 0xb0, 0xb4, 0xb8, 0xe0, 0xf8, 0x104, 0xe4, 0xd4, 0xd8, 0xc8]) put(offset, 0);
    for (const offset of [0xe8, 0xec, 0xf0, 0xf4]) put(offset, -1);
    put(0xdc, 1);
}
