//004A7340, offline path. Progress arithmetic deliberately wraps at32 bits;
//the original redraws only after a change of at least four percentage points.
export function nativeAdvanceSceneLoading(memory,owner,amount,host) {
  host.pumpLoadingEvents();
  const total=(memory.get(owner+0x2bc)+amount)|0;
  memory.put(owner+0x2bc,total);
  const percent=Math.trunc(Math.imul(total,100)/(memory.get(owner+0x2c0)|0))|0;
  const difference=(memory.get(owner+0x2c4)-percent)|0;
  const sign=difference>>31;
  if(((difference^sign)-sign|0)<4)return;
  const [width,height]=host.rendererDimensions(memory.get(owner+0x2b4));
  host.clearRendererRect(memory.get(owner+0x2b4),(-width)|0,(-height)|0,Math.trunc((width|0)/2),Math.trunc((height|0)/2),0);
  const fraction=Math.trunc((memory.get(owner+0x2bc)<<16)/(memory.get(owner+0x2c0)|0))|0;
  host.drawRendererPrimitive(memory.get(owner+0x2b4),0,-0x300000,5,fraction);
  host.presentRenderer(memory.get(owner+0x2b4));
  memory.put(owner+0x2c4,percent);
  const audio=memory.get(memory.get(owner+0x5cd0)+12);
  if(audio)host.playLoadingSound(audio,0x79,8,(Math.trunc((Math.min(percent,100)<<16)/100)+0x10000)|0,0x10000,0);
}
