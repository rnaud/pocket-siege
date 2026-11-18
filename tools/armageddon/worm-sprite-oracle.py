"""Execute original004DB780 worm pose resolver and slope table."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

vt=owner+0x1000;animation=owner+0x2000;out=owner+0x3000
write(owner,vt);write(owner+0x350,animation);write(animation,vt)
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner+0xfc,2);write(owner+0x158,3)
for address,argc in [(0x4c29c0,1),(0x4eedf0,6)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
for offset,address,argc in [(0x5c,stop+0x100,2),(0xc,stop+0x200,2),(0x7c,stop+0x300,0)]:
 write(vt+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  write(read(sp+4),body['x']);write(read(sp+8),body['y']);calls.append(['position'])
 elif address==stop+0x200:
  write(read(sp+4),sprite);write(read(sp+8),progress);calls.append(['current'])
 elif address==stop+0x300:calls.append(['state']);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4c29c0:calls.append(['teamFlags',read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,flags)
 elif address==0x4eedf0:calls.append(['draw']+[signed(read(sp+4+i*4)) for i in range(6)])
cpu.hook_add(UC_HOOK_CODE,hook)
slopeIds=[]
for identity in range(0x13,0x24a):
 index=cpu.mem_read(0x4dbbf4+identity-0x13,1)[0]
 if read(0x4db930+index*4)==0x4db89d:slopeIds.append(identity)
Path('src/armageddon/worm-slope-sprites.json').write_text(json.dumps(slopeIds,separators=(',',':'))+'\n')
inputs=[(sprite,65535,101,slope,facing,0,32768,0) for sprite in range(700) for slope in [-1,0,1] for facing in [-1,1]]
for state,sprite in [(102,32),(113,125),(101,398),(101,533),(101,536),(101,539),(101,125),(101,13),(120,35)]:
 for value in [-2147483648,-65536,-1,0,16384,32767,32768,49152,65535,65536,2147483647]:
  for direction in [-1,0,1]:inputs.append((sprite,value,state,direction,direction,direction,value,value))
cases=[]
for sprite,progress,state,slope,facing,hang,teleport,angle in inputs:
 body=dict(x=123456,y=-765432,slope=slope,facing=facing,hangDirection=hang,xOverride=-99999,teleportProgress=teleport,toolAngle=angle)
 for key,offset in [('slope',0x1b4),('facing',0x1b0),('hangDirection',0x238),('xOverride',0x1fc),('teleportProgress',0x18c),('toolAngle',0x260)]:write(owner+offset,body[key])
 sp=stack+0xf000;write(sp,stop)
 for i in range(4):write(sp+4+i*4,out+i*4)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 calls=[];cpu.emu_start(0x4db780,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(body=body,sprite=sprite,progress=progress,state=state,calls=calls,result={key:signed(read(out+i*4)) for i,key in enumerate(['x','y','sprite','progress'])}))
 # Compose the real pose resolver with the real draw-request routine.
 rank=slope*17;flags=8 if facing>0 else 0;poison=int(sprite==41)
 body.update(team=2,rank=rank,poison=poison)
 write(context+0x1030+3*4,rank);write(owner+0x148,poison)
 sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 calls=[];cpu.emu_start(0x4d8b20,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases[-1].update(flags=flags,renderCalls=calls)
args.output.write_text(json.dumps(dict(sha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} pose cases and {len(slopeIds)} slope strips')
