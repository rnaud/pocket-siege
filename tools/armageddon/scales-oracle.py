"""Capture the original Scales of Justice balance from the executable.

004ECCF0, the world's message 0x446 handler, runs unchanged: alliance count
(scene+0x114E0), team count (scene+0x4886), team alliance bytes
(scene+0x488B + team*0xBB8), team health (004C2C40), worm count (004C2B10),
worm health get/set (004C2CC0/004C2E10) and the 0x430 damage reports are the
interfaces; the health store is simulated and every call recorded.
"""
import argparse
import hashlib
import json
import random
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
write(owner+0x38,scene)
teams=[];calls=[]
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i: signed(read(sp+i*4))
    if address==0x4c2c40:
        t=teams[arg(1)-1];ret(4,sum(h for h in t['hp'] if h>0))
    elif address==0x4c2b10: ret(4,len(teams[arg(1)-1]['hp']))
    elif address==0x4c2cc0: ret(8,teams[arg(1)-1]['hp'][arg(2)-1])
    elif address==0x4c2e10:
        t,w,v=arg(1),arg(2),arg(3);teams[t-1]['hp'][w-1]=v;calls.append({'operation':'set','request':[t,w,v]});ret(12)
    elif address==0x4b26a0:
        record=read(sp+24);calls.append({'operation':'report','event':arg(4),'request':[signed(read(record+i*4)) for i in range(4)]});ret(24)
cpu.hook_add(UC_HOOK_CODE,hook)
rng=random.Random(195)
cases=[]
layouts=[[0,1],[0,1,0],[0,1,2],[0,0,1,1],[1,0],[0,1,1,2]]
for layout in layouts:
    for trial in range(30):
        alliances=max(layout)+1
        state=[{'alliance':a,'hp':[rng.choice([0,0,1,7,33,50,99,100,150,200]) for _ in range(rng.randint(1,8))]} for a in layout]
        teams.clear();teams.extend([{'alliance':t['alliance'],'hp':list(t['hp'])} for t in state])
        cpu.mem_write(scene+0x114e0,bytes([alliances]));cpu.mem_write(scene+0x4886,bytes([len(state)]))
        for i,t in enumerate(state): cpu.mem_write(scene+0x488b+i*0xbb8,bytes([t['alliance']]))
        sp=stack+0xf000;write(sp,stop);calls.clear()
        cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
        cpu.emu_start(0x4eccf0,stop,count=1000000)
        if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('004ECCF0 did not return')
        cases.append({'input':{'alliances':alliances,'teams':state},'result':{'hp':[t['hp'] for t in teams],'calls':list(calls)}})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} cases')
