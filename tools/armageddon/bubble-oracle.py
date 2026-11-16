"""Execute the original bubble update routine and particle RNG.

Only object destruction is intercepted to observe surface retirement.
No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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

context=0x3000000
cpu.mem_map(context,0x20000)
write(owner+0x38,context)
vtable = owner+0x1000
write(owner,vtable)
write(vtable,stop+0x100)
destroyed=False
def hook(cpu,address,size,user):
    global destroyed
    destroyed=True
    sp=cpu.reg_read(UC_X86_REG_ESP)
    cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+8)
cpu.hook_add(UC_HOOK_CODE,hook,begin=stop+0x100,end=stop+0x100)
cases=[]
for size in [1,2,3,4]:
  for seed in [0,1,0xffffffff,0x12345678]:
    for y in [99<<16,100<<16,(100<<16)+65535,102<<16]:
      for vx,vy in [(0,0),(-65536,-32768),(0x7fffffff,65536)]:
        initial={'x':-123456,'y':y,'vx':vx,'vy':vy,'buoyancy':size*0x9999+0x6667,'progress':65000,'sprite':size+0x33f}
        for key,offset in [('x',0x3c),('y',0x40),('vx',0x44),('vy',0x48),('buoyancy',0x4c),('progress',0x50),('sprite',0x54)]:write(owner+offset,initial[key]&0xffffffff)
        write(context+0x1241c,seed);write(context+0x804,100)
        sp=stack+0xff00
        write(sp,stop);write(sp+4,0);write(sp+8,0x3ed)
        cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
        destroyed=False
        cpu.emu_start(0x4d32c0,stop,count=10000)
        if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Bubble tick did not return')
        output={key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in [('x',0x3c),('y',0x40),('vx',0x44),('vy',0x48),('buoyancy',0x4c),('progress',0x50),('sprite',0x54)]}
        cases.append({'input':initial,'seed':seed,'waterY':100,'output':{'bubble':output,'seed':read(context+0x1241c),'alive':not destroyed}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D32C0','method':'Native bubble tick, fixed multiply and particle RNG execute unchanged. Destructor is intercepted to observe retirement.','cases':cases},indent=2)+'\n')
print(f'Captured {len(cases)} native bubble ticks')
