"""Capture the original projectile gas release 004E3870.

The routine runs unchanged with the projectile's gas flag (+0x3A4), sunk flag
(+0x110), delay (+0x360), amount (+0x364) and direction (+0x3C8). Position
(virtual +0x5C), allocation, the scene resource lookup and the 004D37D0 gas
constructor are interfaces whose arguments are recorded.
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
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v): return v if v<0x80000000 else v-0x100000000
def ret(cleanup,value=0):
    sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
vt=owner+0x1000;POSITION=stop+0x100
write(owner,vt);write(vt+0x5c,POSITION);write(owner+0x30,owner+0x6000)
calls=[];state={}
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i: signed(read(sp+i*4))
    if address==POSITION: write(read(sp+4),state['x']);write(read(sp+8),state['y']);ret(8)
    elif address==0x4ccf50: ret(8,0x5555)
    elif address==0x492550: ret(0,state['alloc'])
    elif address==0x4d37d0: calls.append({'operation':'gas','request':[arg(2),arg(3),arg(4)]});ret(0x10)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for emitting in [0,1]:
    for sunk in [0,1]:
        for delay in [0,1,20,21,40,-5]:
            for facing in [1,-1]:
                for x,y in [(0x3201234,0x1009876),(-0x7fff0000,0x7fff0000)]:
                    for alloc in [0x2300000,0]:
                        if alloc==0 and (x,y)!=(0x3201234,0x1009876): continue
                        state.update(x=x,y=y,alloc=alloc)
                        write(owner+0x3a4,emitting);write(owner+0x110,sunk);write(owner+0x360,delay)
                        write(owner+0x364,5);write(owner+0x3c8,facing)
                        sp=stack+0xf000;write(sp,stop);calls.clear()
                        cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
                        cpu.emu_start(0x4e3870,stop,count=10000)
                        if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('004E3870 did not return')
                        cases.append({'input':{'emitting':emitting,'sunk':sunk,'delay':delay,'amount':5,'facing':facing,
                            'x':x,'y':y,'allocated':int(alloc!=0)},'result':{'calls':list(calls),
                            'emitting':signed(read(owner+0x3a4)),'delay':signed(read(owner+0x360))}})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} cases')
