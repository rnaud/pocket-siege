import { nativeCrateArt } from './crate-state.js';

//004B64B0: scene visibility permission and signed controller byte gate bit5.
export function nativeCrateContentsVisible(team, visible, controller, flags) {
  return !!team && !!visible && (controller << 24 >> 24) >= 0 && !!(flags & 0x20);
}
//004AA8F0. This list is independent of the browser's special-weapon drawer.
export function nativeSpecialCrateContent(slot) {
  return [10,19,29,30,31,36,41,42,45,46,49,50,51,54,55,56,60,61].includes(slot | 0);
}

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
