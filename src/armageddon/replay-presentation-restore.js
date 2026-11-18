//004D21C0,004D2770 and004D2050. Surface sampling and drawing are host
//interfaces; particle positions, random state and drawing order are native.
export function nativeInitializeReplayPresentation(memory, options) {
  const view = new DataView(memory.buffer, memory.byteOffset, memory.byteLength);
  const put = (offset, value) => view.setInt32(offset, value, true);
  for (const offset of [0x1748, 0x174c, 0x1750, 0x1754, 0x1758]) put(offset, 0);
  let random = 0x87654321;
  put(0x1744, random);
  const colors = [];
  put(0x1740, 0);
  for (let y = 0; y < options.paletteSource.height && colors.length < 20; y++) {
    const color = options.paletteSource.readPixel(0, y) | 0;
    if (!colors.includes(color)) {
      put(0x16f0 + colors.length * 4, color);
      colors.push(color);
      put(0x1740, colors.length);
    }
  }
  const weather = options.weather, count = weather.lowDetail ? 66 : 200;
  put(0x16ec, count);
  const delta = ((weather.right - weather.left) | 0) >> 16;
  for (let i = 0; i < count; i++) {
    const offset = 0x10c + i * 28;
    put(offset, (Math.trunc(Math.imul(delta, i) / count) << 16) + (weather.left & 0xffff0000));
    put(offset + 4, (((random & 4095) % ((weather.height + 256) | 0)) - 256) << 16);
    random = (Math.imul(random, 0x19660d) + 0x3c6ef35f) | 0;
    put(offset + 8, 0);
    put(offset + 12, 0);
    put(offset + 16, Math.trunc(((i % 3 + 1) * 65536) / 3));
    put(offset + 20, 0);
    put(offset + 24, Math.trunc((random & 65535) / 200) + 262);
    random = (Math.imul(random, 0x19660d) + 0x3c6ef35f) | 0;
  }
  put(0x1744, random);
  const { width, height, draw } = options.surface;
  const x = width - 1, y = height - 1, white = options.palette[9];
  draw(0x3c, 0, 0, width, height, options.palette[8]);
  draw(0x34, 1, x, 0, white);
  draw(0x34, 1, x, y, white);
  draw(0x38, 0, 1, y, white);
  draw(0x38, x, 1, y, white);
  draw(0x38, Math.trunc(x / 2), 0, y, white);
  for (const [px, py] of [[1, 1], [x - 1, 1], [1, y - 1], [x - 1, y - 1]]) draw(0x58, px, py, white);
  for (const [px, py] of [[0, 0], [x, 0], [0, y], [x, y]]) draw(0x58, px, py, 0);
}

//Shared scene-backed palette, weather and surface interfaces for fresh/restore.
export function nativeInitializeReplayPresentationAt(memory,address,scene,host) {
  const source=memory.get(scene+0x28),surface=memory.get(scene+0x2f0);
  let sourceDimensions,surfaceDimensions;
  nativeInitializeReplayPresentation(memory.range(address,0x175c),{
    paletteSource:{get height(){return (sourceDimensions??=host.surfaceDimensions(source))[1];},readPixel:(x,y)=>host.readSurfacePixel(source,x,y)},
    weather:{lowDetail:memory.get(scene+0x1b8ac),left:memory.get(scene+0x1b8cc)|0,right:memory.get(scene+0x1b8d0)|0,height:memory.get(scene+0x804)|0},
    palette:Array.from({length:10},(_,i)=>memory.get(scene+0x12434+i*4)),
    surface:{get width(){return (surfaceDimensions??=host.surfaceDimensions(surface))[0];},get height(){return surfaceDimensions[1];},draw:(method,...args)=>host.drawSurface(surface,method,args)},
  });
}
