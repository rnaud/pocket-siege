"""Execute full41B branch of004E6810 with native descriptor flags, targeting entry and ownership transitions."""
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

context=0x2300000;cpu.mem_map(context,0x20000)
worm=owner+0x1000;vtable=worm+0x100;shape=owner+0x2000;descriptor=owner+0x3000;command=owner+0x4000
write(worm,vtable);write(vtable+12,stop+0x100);write(shape,vtable);write(vtable+20,stop+0x110)
interfaces=[(0x4c32b0,2),(0x4c2ee0,2),(0x4ccf50,2),(0x4edad0,1),(0x4c31f0,3),(0x4c2d60,2),(0x4eea10,1),(0x4eeb70,2),(stop+0x100,3),(stop+0x110,2),(0x4b26f0,4)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [0x4c32b0,0x4c2ee0,0x4ccf50,0x4edad0,0x4c2d60]:
  name,n,result={0x4c32b0:('busy',2,busy),0x4c2ee0:('available',2,available),0x4ccf50:('lookup',2,worm),0x4edad0:('descriptor',1,descriptor),0x4c2d60:('state',2,state)}[address]
  calls.append([name]+[signed(sp+4+i*4) for i in range(n)]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==stop+0x100:
  event=read(sp+4);calls.append(['query',event,read(sp+8)]);p=read(sp+12);cpu.mem_write(p,bytes(0x154))
  if event==0x7d3:write(p+0x20,blocked)
  else:write(p,100*65536+123);write(p+4,20*65536+456)
 elif address==stop+0x110:
  calls.append(['shape']);write(read(sp+4),33);write(read(sp+8),17)
 elif address==0x4c31f0:calls.append(['inventory']+[signed(sp+4+i*4) for i in range(3)])
 elif address==0x4eea10:calls.append(['mode',signed(sp+4)])
 elif address==0x4eeb70:calls.append(['target',signed(sp+4),signed(sp+8)])
 elif address==0x4b26f0:calls.append(['forward',read(sp+8),read(sp+12),list(cpu.mem_read(read(sp+16),read(sp+12)))])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x64,0x6c,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8,0xac,0xbc,0xb0,0xb4,0xe4,0xe8,0xf4,0xd8,0xf8]
cases=[]
def run(fields={},desc={},words=[2,3,34,1],mode=0,active=2,busy_value=0,available_value=1,blocked_value=0,state_value=0x65,owners=[7,9],free=[10,11]):
 global calls,busy,available,blocked,state
 busy=busy_value;available=available_value;blocked=blocked_value;state=state_value;calls=[]
 cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);cpu.mem_write(descriptor,bytes(0x200))
 fields={0x3c:2,0x4c:3,0x40:1,0x44:2,0x48:0,0x64:1,0x6c:5,0x70:0,0xac:1,0xbc:1,0xe4:1,0xe8:9,0xf4:7,0xe0:4,0xdc:-1,0xd8:65536,0xf8:1,**fields}
 for o,v in fields.items():write(owner+o,v&0xffffffff)
 for o,v in desc.items():write(descriptor+o,v&0xffffffff)
 for i,v in enumerate(words):write(command+i*4,v&0xffffffff)
 write(context+0x1d444,mode);cpu.mem_write(context+0x11d7c,struct.pack('<b',active));write(context+0x804,696);write(context+0x1247c,123);write(context+0x12480,700*65536)
 for i in range(19):write(context+0x310+i*4,shape)
 for start,count,values in [(0x1b778,0x1b798,free),(0x1b7ba,0x1b7da,owners)]:
  cpu.mem_write(context+count,struct.pack('<h',len(values)))
  for i,v in enumerate(values):cpu.mem_write(context+start+i*2,struct.pack('<h',v))
 for i in range(len(owners)):cpu.mem_write(context+0x1b79a+i*2,struct.pack('<h',2))
 initial=list(cpu.mem_read(context+0x1b778,0x64))
 sp=stack+0xf000
 for i,v in enumerate([stop,0,0x41b,16,command]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6810,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(fields={str(k):v for k,v in fields.items()},descriptor={str(k):v for k,v in desc.items()},words=words,mode=mode,active=active,busy=busy,available=available,blocked=blocked,state=state,initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],target=[signed(context+o) for o in [0x1247c,0x12480]],ownership=list(cpu.mem_read(context+0x1b778,0x64))))
for kind in [1,2,3,4]:
 for subtype in [0,1,10,17]:
  for mode in [0,1]:
   for active in [2,3,-1]:
    for slot in [1,34,36,40]:run(desc={0x4c:1,0x68:kind,0x6c:subtype,0x70:3 if kind==1 else 2,0xdc:1,0x84:2,0x7c:subtype},mode=mode,active=active,words=[2,8,slot,1])
for field,value in [(0x40,0),(0x48,1),(0xe4,0),(0xe8,-1),(0xf4,-1),(0x70,1),(0x44,-1)]:run(fields={field:value},desc={0x68:3})
for owners in [[],[9],[7],[3,9,7],[7,7,9]]:
 for free in [[],[11]]:run(owners=owners,free=free,desc={0x68:3},state_value=100)
run(busy_value=1);run(available_value=0);run(blocked_value=1);run(words=[1,3,34,1])
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6810 event41B',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} weapon-selection cases')
