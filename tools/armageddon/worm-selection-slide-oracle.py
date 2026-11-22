"""Execute the worm frame event 0x3ED slide block 004D9DFA..004D9EF5.

The label slide (+0x368 toward +0x36C) and the selection arrow slide (+0x360
toward +0x364) run unchanged, including the 004EDA70 ammo-label ease of
+0x370 toward +0x374, held at zero here (the browser has no ammo label yet).
Single frames cover signed gaps around the 0x20C minimum step; sequences
follow both slides from hidden to shown and back.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_ESP, UC_X86_REG_EIP
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
owner, stack = 0x2000000, 0x2100000
for address in [owner, stack]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address):
    value=struct.unpack('<I',cpu.mem_read(address,4))[0]
    return value if value<0x80000000 else value-0x100000000
START, END = 0x4d9dfa, 0x4d9ef5

def frame(state, active=1):
    write(owner+0x360,state['arrow']);write(owner+0x364,state['arrowTarget'])
    write(owner+0x368,state['label']);write(owner+0x36c,state['labelTarget'])
    write(owner+0x370,0);write(owner+0x374,0);write(owner+0x104,active)
    cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,0)
    cpu.reg_write(UC_X86_REG_ESP,stack+0x8000)
    cpu.emu_start(START,END,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=END:raise RuntimeError('Slide block did not complete')
    return dict(arrow=read(owner+0x360),arrowTarget=read(owner+0x364),
        label=read(owner+0x368),labelTarget=read(owner+0x36c))

values=[0,1,0x20b,0x20c,0x20d,0x418,0x4000,0x8000,0xa3d6,0xfdf3,0xfdf4,0xfdf5,0xffff,0x10000,-0x20c,-0x8000]
frames=[]
for current in values:
    for target in [0,0x10000,0x8000,-0x10000]:
        state=dict(arrow=current,arrowTarget=target,label=target,labelTarget=current)
        frames.append(dict(input=state,output=frame(state)))
sequences=[]
for start,target in [(0,0x10000),(0x10000,0),(0x6000,0x10000),(0x10000,0x7fff)]:
    state=dict(arrow=start,arrowTarget=target,label=target,labelTarget=start)
    steps=[]
    for _ in range(80):
        state=frame(state);steps.append(dict(state))
    sequences.append(dict(input=dict(arrow=start,arrowTarget=target,label=target,labelTarget=start),steps=steps))
args.output.write_text(json.dumps({'sha256':digest,'frames':frames,'sequences':sequences},separators=(',',':'))+'\n')
print(f'{len(frames)} slide frames, {len(sequences)} sequences')
