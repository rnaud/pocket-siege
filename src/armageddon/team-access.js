//0049C940: ownership-dependent team flags at scene+1C164 and the shared
//counter at561EC8. Valid player indices are0..12; negative controllers are AI.
export function nativeInitializeTeamAccess(scene,sharedCounter) {
  const view=new DataView(scene.buffer,scene.byteOffset,scene.byteLength);
  const count=scene[0x4886],grouped=scene[0x47a8],groups=new Int32Array(13).fill(-1);
  new DataView(sharedCounter.buffer,sharedCounter.byteOffset,sharedCounter.byteLength).setInt32(0,0,true);
  for(let team=0;team<count;team++)view.setInt32(0x1c164+team*4,1,true);
  for(let team=0;team<count;team++) {
    const offset=0x4888+team*3000,controller=view.getInt8(offset);
    if(grouped && controller>=0 && groups[controller]<0)groups[controller]=view.getInt8(offset+3);
  }
  for(let team=0;team<6;team++)view.setInt32(0x1c164+team*4,scene[0x11d56],true);
  for(let team=0;team<count;team++) {
    const controller=view.getInt8(0x4888+team*3000);
    if(controller<0)continue;
    if(!grouped || (groups[controller]>=0 && groups[view.getInt8(0x11d7c)]===groups[controller]))
      view.setInt32(0x1c164+team*4,1,true);
  }
}
