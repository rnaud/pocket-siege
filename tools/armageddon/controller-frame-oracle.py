"""Execute controller frame dispatch and countdown processing against the original executable."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    parser.error('Executable differs from verified WA 3.0.0.0')
pe = struct.unpack_from('<I',data,0x3c)[0]
optional = pe+24
base = struct.unpack_from('<I',data,optional+28)[0]
size = struct.unpack_from('<I',data,optional+56)[0]
cpu = Uc(UC_ARCH_X86, UC_MODE_32)
cpu.mem_map(base,(size+0xfff)&~0xfff)
cpu.mem_write(base,data[:struct.unpack_from('<I',data,optional+60)[0]])
headers = optional+struct.unpack_from('<H',data,pe+20)[0]
for i in range(struct.unpack_from('<H',data,pe+6)[0]):
    _,rva,size,offset=struct.unpack_from('<IIII',data,headers+40*i+8)
    if size: cpu.mem_write(base+rva,data[offset:offset+size])
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]

context=0x2300000;cpu.mem_map(context,0x20000);command=owner+0x1000
interfaces=[(0x4b26f0,4),(0x4b26a0,6),(0x4c2ee0,2),(0x4c32b0,2),(0x4ee990,3),(0x4e5f70,0),(0x502850,0),(0x5027d0,0),(0x4e5bf0,0),(0x4e6190,0),(0x4e82c0,0),(0x5010e0,1),(0x4edc90,5)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26a0:
  event=read(sp+16)
  if event==0x41b:
   p=read(sp+24);calls.append(['select']+[signed(p+i*4) for i in range(4)]+[read(sp+20)])
  else:calls.append(['send',read(sp+8),signed(sp+12),event,read(sp+20),None])
 elif address==0x4b26f0:calls.append(['forward',read(sp+8),list(cpu.mem_read(read(sp+16),read(sp+12)))])
 else:
  name,n,result={0x4c2ee0:('available',2,available),0x4c32b0:('busy',2,busy),0x4ee990:('camera',3,0),0x4e5f70:('update',0,0),0x502850:('cameraInput',0,0),0x5027d0:('pauseInput',0,0),0x4e5bf0:('draw',0,0),0x4e6190:('targetDraw',0,0),0x4e82c0:('timerDraw',0,0),0x5010e0:('input',1,0),0x4edc90:('sound',5,0)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x68,0x7c,0x80,0xb0,0xb8,0xc8,0x104];cases=[]
for event in [0x3ea,0x3eb,0x3ec,0x3ed,0x3ef]:
 for bits in range(256):
  cpu.mem_write(owner,bytes(0x2000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
  timers=[0,1,19,20,21,999,1000,1001,1019,1020,2000,2020,3000,3020,-1,-2147483648]
  values=[0,1,-1,2147483647,-2147483648,65536,-65536]
  fields={0x3c:2,0x4c:3,0x40:0 if bits&1 else 1,0x44:2,0x5c:(bits>>1)&1,0x68:17 if bits&4 else 0,0x7c:timers[bits%16],0x80:[0,1000,2000,3000][bits%4],0xb0:values[bits%7],0xb4:values[(bits//7)%7],0xb8:(bits>>3)&1,0xc8:0,0x104:values[(bits//3)%7]}
  for o,v in fields.items():write(owner+o,v&0xffffffff)
  active=2 if bits&16 else 1;spectator=-1 if bits&32 else 0;network=(bits>>6)&1
  cpu.mem_write(context+0x11d7c,struct.pack('<b',active));cpu.mem_write(context+0x11e78,struct.pack('<b',spectator));write(context+0x20,network)
  write(context+0x1247c,123456);write(context+0x12480,0xfffe0000);write(command,123)
  available=(bits>>7)&1;busy=(bits>>6)&1;calls=[];sp=stack+0xf000
  for i,v in enumerate([stop,0,event,4,command]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(event=event,fields={str(k):v for k,v in fields.items()},active=active,spectator=spectator,network=network,available=available,busy=busy,calls=calls,body=[signed(owner+o) for o in offsets]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 frame branches with004E6740 and004E8410',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} frame processing cases')
