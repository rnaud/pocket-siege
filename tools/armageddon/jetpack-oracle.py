"""Execute original jetpack animation tick instructions in Unicorn.

Animation interface calls are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
animator,vtable,clear,queue=owner+0x800,owner+0x900,owner+0xa00,owner+0xb00
write(owner+0x350,animator);write(animator,vtable)
write(vtable+0x14,clear);write(vtable+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
bodyvt,transition=owner+0x3000,owner+0xd00
write(owner,bodyvt);write(bodyvt+0x80,transition);cpu.mem_write(transition,b'\xc2\x04\x00')
output={}
def observe(cpu,address,size,unused):
 if address==queue:output['sprite']=read(cpu.reg_read(UC_X86_REG_ESP)+4)
 if address==transition:output['target']=read(cpu.reg_read(UC_X86_REG_ESP)+4)
cpu.hook_add(UC_HOOK_CODE,observe,begin=clear,end=transition)
cases=[]
for facing in [-1,1]:
 for lean in [-0x38000,-0x28000,-0x18000,-0x8000,0,0x8000,0x18000,0x28000,0x38000]:
  for side,down,fuel,locked in [(0,0,0x640000,0),(0x10000,0x10000,1,0),(0x8000,0x4ccc,0x640000,0),(0x10000,0x10000,0,0),(0x10000,0x10000,1,1),(0x10000,0x10000,0x1e0000,1)]:
   inp={'facing':facing,'lean':lean,'side':side,'down':down,'fuel':fuel,'fuelLocked':bool(locked)}
   for offset,key in [(0x1b0,'facing'),(0x238,'lean'),(0x240,'side'),(0x244,'down'),(0x234,'fuel')]:write(owner+offset,inp[key]&0xffffffff)
   write(owner+0x1c8,locked);output={'target':None}
   write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4dc470,stop,count=2000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Jetpack tick did not return')
   for offset,key in [(0x238,'lean'),(0x240,'side'),(0x244,'down'),(0x234,'fuel')]:output[key]=struct.unpack('<i',cpu.mem_read(owner+offset,4))[0]
   cases.append({'input':inp,'output':output})
# Execute input dispatch unchanged; body interfaces expose the supplied velocity
# after observing its impulse. Gravity and virtual getters are boundary stubs.
world,manager,manager_vt=owner+0x4000,owner+0x5000,owner+0x6000
gravity_get,impulse,get_velocity,set_velocity=[owner+x for x in [0x7000,0x7100,0x7200,0x7300]]
write(owner+0x38,world);write(world+0x7d4,manager);write(manager,manager_vt)
write(manager_vt+0x24,gravity_get)
for offset,address,ret in [(0x118,impulse,12),(0x60,get_velocity,8),(0x104,set_velocity,8)]:
 write(bodyvt+offset,address);cpu.mem_write(address,bytes([0xc2,ret,0]))
cpu.mem_write(gravity_get,b'\xc3')
def signed(address):return struct.unpack('<i',cpu.mem_read(address,4))[0]
def input_observe(cpu,address,size,unused):
 esp=cpu.reg_read(UC_X86_REG_ESP)
 if address==gravity_get:cpu.reg_write(UC_X86_REG_EAX,gravity)
 if address==impulse:output['impulse']=[signed(esp+4*i) for i in [1,2,3]]
 if address==get_velocity:
  write(read(esp+4),velocity[0]&0xffffffff);write(read(esp+8),velocity[1]&0xffffffff)
 if address==set_velocity:output['velocity']={'vx':signed(esp+4),'vy':signed(esp+8)}
cpu.hook_add(UC_HOOK_CODE,input_observe,begin=gravity_get,end=set_velocity)
input_cases=[]
for gravity in [0,0x1eb8,0x3d70,0x7ae0]:
 for keys in range(8):
  for side,down,velocity in [(0,0,(0,0)),(0xf000,0xffff,(-0x70000,0x70000)),(0x10000,0x10000,(0x50000,-0x50000))]:
   inp={'facing':-1,'side':side,'down':down}
   controls={'left':bool(keys&1),'right':bool(keys&2),'up':bool(keys&4)}
   for offset,value in [(0x1b0,-1),(0x240,side),(0x244,down),(0x1e4,keys&1),(0x1e8,keys&2),(0x1dc,keys&4)]:write(owner+offset,value&0xffffffff)
   output={};write(stack+0xff00,stop)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4dc560,stop,count=2000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Jetpack input did not return')
   for offset,key in [(0x1b0,'facing'),(0x240,'side'),(0x244,'down')]:output[key]=signed(owner+offset)
   input_cases.append({'input':inp,'controls':controls,'gravity':gravity,'velocity':velocity,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004DC470 / 004DC560','method':'Original animation, input dispatch, easing and clamping execute unchanged; body impulse/getter/setter interfaces observed.','cases':cases,'inputCases':input_cases},indent=2)+'\n')
print(f'Captured {len(cases)} jetpack ticks and {len(input_cases)} input cases')
