import {nativeCreatePanelImage} from './panel-resources.js';

//00500170. Shared portrait label storage corresponds to global0056FAF8.
export function nativeCreateControllerPortrait(memory,address,scene,team,host) {
  memory.put(address,0x5277c8);memory.put(address+4,team);memory.put(address+8,scene);
  host.setPortraitLabel(host.portraitLabel(memory.get(scene+0x1c)));
  for(const offset of [0x168,0x16c])memory.put(address+offset,-1);
  for(const offset of [12,16,20,24,28,32,40,44])memory.put(address+offset,0);
  return address;
}

//004FFED0. Preserve untouched fields and original signed dimension arithmetic.
export function nativeCreateControllerFrame(memory,address,palette,scale,left,top,right,bottom,foreground,background,host) {
  const width=(right-left)|0,height=(bottom-top)|0;
  for(const [offset,value] of [[0,0x5277c0],[28,left],[32,top],[36,right],[40,bottom],[52,palette],[24,scale],[16,foreground],[44,width],[20,background],[48,height],[12,0],[4,0],[8,0]])memory.put(address+offset,value);
  const image=host.allocate(44);
  if(image){nativeCreatePanelImage(memory,image,(Math.imul(scale,width)+2)|0,(height+2)|0,8,host);memory.put(image,0x5249b0);}
  memory.put(address+56,image);return address;
}
