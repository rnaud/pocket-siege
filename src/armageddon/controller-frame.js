import { nativeCollectCameraInput, nativeCollectPauseInput } from './controller-frame-input.js';
import { fixedMultiply } from './numeric.js';
import { nativeControllerPendingWeapon } from './controller-post-shot.js';
import { nativeCollectControllerInput } from './controller-input.js';
const view=memory=>new DataView(memory.buffer,memory.byteOffset,memory.byteLength);

//004E8410: the selection timer runs in20ms increments, with native pitch steps.
export function nativeControllerCountdown(memory,sceneMemory,host) {
  const body=view(memory),scene=view(sceneMemory),get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  const old=get(0x7c);if(!old)return;
  const next=(old-20)|0;put(0x7c,next);
  const audible=()=>scene.getInt8(0x11e78)>=0 && (scene.getInt8(0x11d7c)===get(0x44) || !scene.getInt32(0x20,true));
  if(next<1) {
    put(0x7c,0);
    if(audible())host.selectionSound(0x5c,8,0x13333,65536,0);
    host.sendTask(0x14,0,0x449,0,null);return;
  }
  if(next<3001 && Math.trunc(get(0x80)/-1000)!==Math.trunc(next/-1000) && audible()) {
    const pitch=(Math.trunc((Math.trunc(((old+979)|0)/1000)<<16)/-24)+0x13333)|0;
    host.selectionSound(0x5c,8,pitch,65536,0);
  }
  put(0x80,get(0x7c));
}

//004E6810 frame branches. Presentation remains an explicit adapter; selection, countdown and the default input collector are native.
export function nativeControllerFrame(memory,sceneMemory,event,payload,host) {
  if(![0x3ea,0x3eb,0x3ec,0x3ed,0x3ef].includes(event))return false;
  const body=view(memory),scene=view(sceneMemory),get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  if(event===0x3ea) {
    host.forward(event,payload);nativeControllerPendingWeapon(memory,host);
    if(get(0xb8)){host.cameraTarget(0,scene.getInt32(0x1247c,true),scene.getInt32(0x12480,true));put(0xb8,0);}
    host.updatePresentation();
    if(host.collectCameraInput)host.collectCameraInput();else nativeCollectCameraInput(memory,sceneMemory,host);
    if(host.collectPauseInput)host.collectPauseInput();else nativeCollectPauseInput(memory,sceneMemory,host);
    nativeControllerCountdown(memory,sceneMemory,host);
  } else if(event===0x3eb) {
    host.drawPresentation();host.drawTargeting();host.drawCountdown();host.forward(event,payload);
  } else if(event===0x3ec) {
    const token=view(payload).getUint32(0,true);
    if(host.collectInput)host.collectInput(token);
    else nativeCollectControllerInput(memory,sceneMemory,host.inputQueue(token),host);
    host.forward(event,payload);
  } else {
    if(event===0x3ed){put(0x104,(get(0x104)+0xccc)|0);put(0xb0,(get(0xb0)+fixedMultiply((get(0xb4)-get(0xb0))|0,0x3333))|0);}
    else put(0xc8,1);
    host.forward(event,payload);
  }
  return true;
}
