"""Capture the worm's floating weapon icon from the original executable.

Three routines run unchanged:
- 004DE12E..004DE1D7, the per-frame choice of icon and size target from
  worm state and the equipped weapon (+0x170 slot, +0x354 record);
- 004D8A00, the icon draw request (position, rise, border colours, order);
- 004FD690, the icon image: a centred crop of the lo\\ icon growing with the
  progress, a one-pixel border and transparent corners.
Only the worm virtuals (position, state), the renderer queue and the
bitmap's drawing methods are boundaries; their arguments are recorded.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_ESP, UC_X86_REG_EIP
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
def signed(value): return value if value<0x80000000 else value-0x100000000
def read(address): return signed(struct.unpack('<I',cpu.mem_read(address,4))[0])
def stub(address,argc): cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4) if argc else b'\xc3')

vt, record, panel, bitmap, bitmap_vt = owner+0x1000, owner+0x2000, owner+0x3000, owner+0x4000, owner+0x5000
write(owner,vt);write(owner+0x38,scene);write(owner+0x354,record);write(owner+0x358,panel)
for slot in range(80): write(scene+0xb8+slot*8,0x7000+slot)
for color in range(10): write(scene+0x12434+color*4,0x100+color)
STATE, POSITION = stop+0x100, stop+0x200
write(vt+0x7c,STATE);stub(STATE,0)
write(vt+0x5c,POSITION);stub(POSITION,2)
stub(0x4eed70,10)
ICON_PANEL = 0x4fd690
calls = []
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    arg=lambda i: read(sp+i*4)
    if address==STATE: cpu.reg_write(UC_X86_REG_EAX,current['state'])
    elif address==POSITION:
        write(arg(1),current['x']);write(arg(2),current['y'])
    elif address==0x4eed70: calls.append(['queue']+[arg(i) for i in range(1,11)])
    elif address==ICON_PANEL and stub_panel:
        calls.append(['panel']+[arg(i) for i in range(1,5)])
        write(arg(5),current['size']);write(arg(6),current['size'])
        cpu.reg_write(UC_X86_REG_EAX,0x6666)
        cpu.reg_write(UC_X86_REG_ESP,sp+4+0x18);cpu.reg_write(UC_X86_REG_EIP,read(sp))
    elif bitmap_vt<=address<bitmap_vt+0x100 and address in methods:
        offset,argc=methods[address]
        calls.append([hex(offset)]+[arg(i) for i in range(1,argc+1)])
cpu.hook_add(UC_HOOK_CODE,hook)

# 004DE12E..004DE1D7: icon slot and size target.
update=[]
UPDATE_START, UPDATE_END = 0x4de12e, 0x4de1d7
for slot in [0,19,37]:
    for kind,subtype in [(4,5),(4,0x13),(4,0x15),(4,0x18),(4,6),(4,0x12),(1,5)]:
        for state in [0x65,0x67,0x78,0x7b,0x7c,0x7d,0x79]:
            for previous in [0,0x7000+slot,0x7000+3]:
                current=dict(state=state)
                write(owner+0x170,slot);write(record+0x68,kind);write(record+0x6c,subtype)
                write(owner+0x35c,previous);write(owner+0x370,0x8000);write(owner+0x374,0x4000)
                cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,vt);cpu.reg_write(UC_X86_REG_ESP,stack+0x8000)
                stub_panel=False
                cpu.emu_start(UPDATE_START,UPDATE_END,count=10000)
                if cpu.reg_read(UC_X86_REG_EIP)!=UPDATE_END: raise RuntimeError('Icon update did not complete')
                update.append(dict(input=dict(slot=slot,kind=kind,subtype=subtype,state=state,value=previous,progress=0x8000,target=0x4000),
                    output=dict(value=read(owner+0x35c),progress=read(owner+0x370),target=read(owner+0x374))))

# 004D8A00: draw request with the panel routine as a boundary.
draws=[]
for progress in [0,1,0x8000,0x10000,0x18000,0x20000]:
    for value in [0,0x7013]:
        for ready in [0,1]:
            for facing in [-1,1]:
                for tick in [0,24,25,74]:
                    current=dict(x=-17*65536,y=250*65536,size=24)
                    write(owner+0x370,progress);write(owner+0x35c,value);write(owner+0x2a0,ready)
                    write(owner+0x1b8,facing<<16);write(owner+0x158,2);write(scene+0x1030+8,5);write(scene+0x1b8ec,tick)
                    calls=[];stub_panel=True
                    sp=stack+0x8000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
                    cpu.emu_start(0x4d8a00,stop,count=20000)
                    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Icon draw did not return')
                    draws.append(dict(input=dict(progress=progress,value=value,ready=ready,facing=facing,tick=tick,
                        x=current['x'],y=current['y'],rank=5,panelSize=current['size']),calls=calls))

# 004FD690: icon panel built over a 2,2..30,30 crop (004D664F constructor).
methods={}
for index,(offset,argc) in enumerate([(0x34,4),(0x38,4),(0x3c,5),(0x4c,8),(0x58,3)]):
    address=bitmap_vt+0x10*index;write(bitmap+0,bitmap_vt+0x80);write(bitmap_vt+0x80+offset,address)
    stub(address,argc);methods[address]=(offset,argc)
write(bitmap,bitmap_vt+0x80)
panels=[]
for sequence in [[0,0x1000,0x8000,0x8000,0x10000,0x20000,-0x4000],[0x10000,0x10000],[0x6000,0x6000]]:
    for field,value in [(4,-1),(8,-1),(0xc,-1),(0x10,-1),(0x14,2),(0x18,2),(0x1c,30),(0x20,30),(0x24,28),(0x28,28),(0x2c,0),(0x30,bitmap)]:
        write(panel+field,value)
    steps=[]
    for i,progress in enumerate(sequence):
        image=0x7013 if i<5 else 0x7020
        blink=0x107 if i%2 else 0x109
        calls=[];stub_panel=False
        sp=stack+0x8000;out=stack+0x9000
        for j,value in enumerate([stop,image,progress,blink,0x108,out,out+4]): write(sp+j*4,value)
        cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,panel)
        cpu.emu_start(ICON_PANEL,stop,count=20000)
        if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Icon panel did not return')
        steps.append(dict(input=dict(image=image,progress=progress,border=blink,fill=0x108),
            output=dict(width=read(out),height=read(out+4),bitmap=signed(cpu.reg_read(UC_X86_REG_EAX)&0xffffffff)==bitmap),calls=calls))
    panels.append(steps)

args.output.write_text(json.dumps({'sha256':digest,'update':update,'draws':draws,'panels':panels},separators=(',',':'))+'\n')
print(f'{len(update)} updates, {len(draws)} draws, {sum(map(len,panels))} panel builds')
