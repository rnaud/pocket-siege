"""Execute original hitscan resolution instructions in Unicorn.

Original hit resolution, damage variation and RNG execute; collision distances are supplied and dispatches captured. No game entry point runs.
"""
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



context, record, shot = owner+0x4000, owner+0x2000, owner+0x3000
terrain, vtable, query = owner+0x7000, owner+0x8000, owner+0x9000
write(owner+0x38,context);write(context+0x24,terrain);write(terrain,vtable);write(vtable+0x24,query)
for addr, count in [(0x4fbea0,24),(query,20),(0x4b26a0,24),(0x4f7da0,48),(0x4ee1d0,16)]:
 cpu.mem_write(addr,b'\xc2'+struct.pack('<H',count))
def words(addr,n):return list(struct.unpack('<'+'i'*n,cpu.mem_read(addr,n*4)))
output={}
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4fbea0:cpu.reg_write(UC_X86_REG_EAX,body&0xffffffff)
 elif address==query:cpu.reg_write(UC_X86_REG_EAX,ground&0xffffffff)
 elif address==0x4b26a0:output['event']=words(read(sp+24),6)
 elif address==0x4f7da0:output['area']=words(sp+4,12)
 elif address==0x4ee1d0:output['effect']=words(sp+4,4)
for address in [0x4fbea0,query,0x4b26a0,0x4f7da0,0x4ee1d0]:cpu.hook_add(UC_HOOK_CODE,capture,begin=address,end=address)
cases=[]
for body,ground in [(-1,-1),(20,-1),(-1,30),(20,30),(30,20),(20,20)]:
 for dx,dy in [(65536,0),(-46340,46340),(23000,-100000)]:
  for damage,variance in [(25,0),(50,30),(31,-20)]:
   for mask in [4332670,4]:
    for seed,frame in [(0,0),(0xffffffff,91)]:
     config=dict(mode=2,push=100,damage=damage,variance=variance,range=1920,collisionMask=mask,extentFactor=1,impulseNumerator=3,impulseDenominator=2)
     for offset,value in [(0x14,mask),(0x1c,100),(0x20,damage),(0x24,variance),(0x28,2),(0x2c,1920)]:write(record+offset,value&0xffffffff)
     write(context+0x814,1);write(owner+0x2a4,3);write(owner+0x2a8,2)
     write(context+0x1acc,seed);write(context+0x7f0,frame)
     packet=[0,1,1234567,-654321,dx,dy,0,0,0,0,0]
     for i,value in enumerate(packet):write(shot+i*4,value&0xffffffff)
     output={};sp=stack+0xf000
     for i,value in enumerate([stop,record,shot]):write(sp+i*4,value)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4fc020,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Resolution failed to return')
     cases.append(dict(shot=packet,config=config,body=body,terrain=ground,seed=seed,frame=frame,output=output,random=read(context+0x1acc)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004FC020',method='Original resolution, variation and RNG; supplied collision distances, captured effect/event/area dispatch.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} hitscan resolutions')
