import { nativeReleaseInputOwner } from './controller-ownership.js';
import { nativeSelectControllerWorm } from './worm-selection.js';

// Remaining local control branches of004E6810. Unknown events remain for the
// lifecycle/task dispatcher rather than being treated as completed no-ops.
export function nativeControllerControl(memory,sceneMemory,event,payload,host) {
  if(![0x424,0x425,0x427,0x42b,0x42d,0x42e,0x42f,0x434,0x435,0x436,0x437,0x438,0x43a,0x43b].includes(event))return false;
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength),scene=new DataView(sceneMemory.buffer,sceneMemory.byteOffset,sceneMemory.byteLength);
  const get=o=>body.getInt32(o,true),put=(o,v)=>body.setInt32(o,v,true);
  const p=()=>new DataView(payload.buffer,payload.byteOffset,payload.byteLength);
  const selected=()=>p().getInt32(0,true)===get(0x3c);
  const select=worm=>host.selectWorm?host.selectWorm(worm):nativeSelectControllerWorm(memory,sceneMemory,worm,host);
  const stopTimer=()=>{if(get(0x7c)){put(0x7c,0);host.sendTask(0x14,0,0x449,0,null);}};
  if(event===0x424 || event===0x425){if(selected())put(0x5c,event===0x424?1:0);host.forward(event,payload);}
  else if(event===0x427){if(selected())select(p().getInt32(4,true));}
  else if(event===0x42b && selected()) {
    stopTimer();let worm=get(0x4c),found=false;const count=host.wormCount(get(0x3c));
    for(let i=0;i<count;i++) {
      worm=(worm+1)|0;if(worm>count)worm=1;
      if(host.wormHealth(get(0x3c),worm)>0){found=true;break;}
    }
    select(found?worm:0);
  } else if(event===0x42d){put(0x84,1);host.forward(event,payload);}
  else if(event===0x42e) {
    if(get(0xe4)){put(0xe4,0);nativeReleaseInputOwner(body,scene,0xf4,0x1b778);put(0xd8,0);}
    put(0x84,0);host.forward(event,payload);
  } else if(event===0x42f && selected()){stopTimer();host.forward(event,payload);}
  else if(event===0x434)put(0x70,(get(0x70)+1)|0);
  else if(event===0x435 && selected() && !get(0x6c)){host.selectionSound(0x5b,8,65536,65536,0);put(0x6c,1);}
  else if(event===0x436){put(0x70,(get(0x70)-1)|0);if(!get(0x70))put(0xf8,0);}
  else if([0x437,0x438,0x43a,0x43b].includes(event) && selected()) {
    const offset=event<0x43a?0x74:0x78;put(offset,(get(offset)+([0x437,0x43a].includes(event)?1:-1))|0);
  }
  return true;
}
