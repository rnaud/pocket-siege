import { nativeCrateArt } from './crate-state.js';

//004E0CC0. Text rasterization and final image/sprite queue submission are interfaces.
export function nativeDrawCrate(body, scene, host) {
  const { x, y } = host.position();
  const rank = Math.imul(body.rank, 2);
  const phase = Math.trunc(scene.frame / 25) & 1;
  if ((body.kind === 1 || body.kind === 4) && scene.labelMode < 3 && scene.showContents) {
    let font = 16;
    if (host.special(body.content) && phase) font = 15;
    const ink = host.palette(7), paper = host.palette(8);
    const text = host.name(body.content);
    const label = host.raster(body.contentLabel, text, font, paper, ink, 65536);
    host.image((rank + 0xd0200) | 0, x, (y - 0x200000) | 0, 0,
      label.image, 0, 0, label.width, label.height, 0);
  }
  const { sprite, progress } = nativeCrateArt(body);
  host.sprite((rank + (body.kind === 5 ? 0xf0000 : 0xb0000)) | 0,
    x, body.kind === 5 ? (y - 0x40000) | 0 : y, 0, sprite, progress);
  if (body.fuse && !host.submerged()) {
    const text = host.format(Math.trunc(((body.fuse + 999) | 0) / 1000));
    const ink = host.palette(body.fuse < 3000 && phase ? 9 : 7);
    const paper = host.palette(8);
    const label = host.raster(body.fuseLabel, text, body.fuse < 3000 ? 9 : 15, paper, ink, 65536);
    host.image((rank + 0xb0000) | 0, (x - 0x180000) | 0, (y - 0x180000) | 0, 0,
      label.image, 0, 0, label.width, label.height, 0);
  }
}
