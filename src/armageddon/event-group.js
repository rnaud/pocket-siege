//004EA9C0 with004ED970. Base child attachment and registry insertion retain
//their native interfaces; context inheritance and all100 event flags run here.
export function nativeCreateEventGroup(memory,address,parent,type,index,host) {
  host.call(0x4b1ae0,address,[parent]);
  memory.put(address,0x527478);memory.put(address+0x2c,2);
  memory.put(address+0x38,memory.get(parent+0x38));
  memory.put(address,0x527428);memory.put(address+0x2c,7);
  for(let offset=0x3c;offset<0xa0;offset+=4)memory.put(address+offset,0);
  host.call(0x4b2670,address,[type,index]);return address;
}

//004EA940/004EA950 and004EAAA0. Event range follows the native100-byte mask.
export function nativeSetGroupSubscription(memory,address,event,enabled) {
  memory.putByte(address-0x3ac+event,enabled?1:0);
}
export function nativeDispatchEventGroup(memory,address,sender,event,size,payload,forward) {
  if(memory.byte(address-0x3ac+event))forward(sender,event,size,payload);
}
