"""Capture the original Sheep Strike contact flames 004E2F60.

The routine runs unchanged with the original logic random stream; the scene
resource lookup, allocation and the 004D3C50 flame constructor are interfaces
whose 11-word flame records are recorded.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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
owner, stack, stop, scene = 0x2000000, 0x2100000, 0x2200000, 0x2300000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
cpu.mem_map(scene,0x20000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
write(owner+0x38,scene);write(owner+0x30,owner+0x6000)
calls=[];state={}
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==0x4ccf50: ret(8,0x5555)
    elif address==0x492550: ret(0,state['alloc'])
    elif address==0x4d3c50:
        record=read(sp+8);calls.append([signed(read(record+i*4)) for i in range(11)]);ret(8)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for count in [0,1,12]:
    for seed,frame in [(0,0),(0x12345678,9),(0xffffffff,0x7fffffff)]:
        for x,y in [(0x3201234,0x1009876),(-0x10000,0x7fff0000)]:
            for alloc in [0x2400000,0]:
                if alloc==0 and count!=12: continue
                state['alloc']=alloc;write(scene+0x1acc,seed);write(scene+0x7f0,frame)
                sp=stack+0xf000
                for i,v in enumerate([stop,x,y,count]): write(sp+i*4,v)
                calls.clear();cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
                cpu.emu_start(0x4e2f60,stop,count=100000)
                if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('004E2F60 did not return')
                cases.append({'input':{'count':count,'seed':seed,'frame':frame,'x':x,'y':y,'allocated':int(alloc!=0)},
                    'result':{'flames':list(calls),'random':read(scene+0x1acc)}})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} cases')
