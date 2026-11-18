import {nativeCreatePanelImage,nativeCreatePanelText} from './panel-resources.js';

//004B8E70/004B8C20 and their004EFB40/004EFBC0/004EFD90 list setup.
//Memory uses native addresses. Allocation and font metrics are supplied
//by the host; alliance grouping, list ownership and ordering execute here.
export function nativeCreateTeamPanelTree(memory,address,scene,host) {
  const list=(at,vtable)=>{
    memory.put(at,0x527498);memory.put(at+8,6);memory.put(at+4,0);
    memory.put(at+12,host.allocateArray(24,0x56f790));memory.put(at,vtable);
  };
  const finish=(at,entries)=>{
    memory.put(at+44,entries.length);
    for(let i=0;i<entries.length;i++)memory.put(at+48+i*4,entries[i]);
    for(const offset of [16,28])memory.put(at+offset,-1);
    for(const offset of [20,24,32,36,40])memory.put(at+offset,0);
    memory.put(at+4,entries.length);
    for(let i=0;i<entries.length;i++)memory.put(memory.get(at+12)+i*4,entries[i]);
    memory.put(at+40,1);
  };
  const count=memory.byte(scene+0x4886),groups=[];
  list(address,0x526828);memory.put(address+72,scene);
  for(let team=0;team<count;team++) {
    const group=(memory.byte(scene+0x488b+team*3000)<<24)>>24;
    if(!groups.includes(group))groups.push(group);
  }
  const entries=[];
  for(const group of groups) {
    const entry=host.allocate(16);entries.push(entry);
    if(!entry)continue;
    memory.put(entry,0x5267e8);memory.put(entry+4,group);memory.put(entry+8,scene);
    const teams=[];
    for(let team=0;team<count;team++)if(((memory.byte(scene+0x488b+team*3000)<<24)>>24)===group)teams.push(team+1);
    const panel=host.allocate(72);
    if(panel) {
      list(panel,0x526780);
      const children=teams.map(team=>{
        const child=host.allocate(36);
        return child?(host.createTeamPanel?host.createTeamPanel(child,team,scene):nativeCreateTeamPanel(memory,child,team,scene,host)):0;
      });
      finish(panel,children);
    }
    memory.put(entry+12,panel);
  }
  finish(address,entries);
  return address;
}

//004B8350. Original per-team panel fields and resource request order.
export function nativeCreateTeamPanel(memory,address,team,scene,host) {
  memory.put(address,0x526740);memory.put(address+4,team);memory.put(address+12,scene);
  memory.put(address+8,memory.byte(scene+0x3cd1+team*3000));
  const resources=memory.get(scene+8),height=host.fontHeight(resources,15,32);
  memory.put(address+32,height);
  const text=host.allocate(0x138);
  memory.put(address+16,text?(host.createText?host.createText(text,resources,15,256):nativeCreatePanelText(memory,text,resources,15,256,host)):0);
  const image=host.allocate(44);
  if(image){if(host.createImage)host.createImage(image,128,(height+1)|0,8);else nativeCreatePanelImage(memory,image,128,(height+1)|0,8,host);memory.put(image,0x5249b0);}
  memory.put(address+20,image);memory.put(address+28,0);memory.put(address+24,0);
  memory.put(scene+0x1b5c+team*4,65536);memory.put(scene+0x1b74+team*4,65536);
  return address;
}
