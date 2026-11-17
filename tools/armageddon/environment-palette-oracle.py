"""Execute original environment palette transformation."""
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

context=0x2400000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
graphics=owner+0x1000;write(context+8,graphics);write(graphics,graphics+0x100);write(graphics+0x114,stop+0x100);write(graphics+0x158,stop+0x200)
sources=[owner+0x2000+i*0x1000 for i in range(3)];destinations=[owner+0x6000+i*0x1000 for i in range(3)]
for i,dest in enumerate(destinations):write(owner+0x3c+i*4,dest)
calls=[]
def ret(cleanup,value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:ret(4,sources[read(sp+4)-1])
 elif address==stop+0x200:
  calls.append({'operation':'submit','bank':destinations.index(read(sp+4))+1});ret(4)
 elif address==0x4adfc0:
  color=list(struct.unpack('<3h',cpu.mem_read(read(sp+4),6)))
  calls.append({'operation':'blend','bank':destinations.index(cpu.reg_read(UC_X86_REG_ECX))+1,'color':color,'amount':signed(read(sp+8))})
cpu.hook_add(UC_HOOK_CODE,hook)
colors=[[i*13%256,i*47%256,i*89%256] for i in range(16)]
ranges=[[0,3],[4,11],[12,15]]
for source,(first,last) in zip(sources,ranges):
 write(source+4,first);write(source+8,last)
 for i,color in enumerate(colors):cpu.mem_write(source+12+i*6,struct.pack('<3h',*color))
cases=[]
for flash in [0,16384,65536]:
 for fade in [0,32768,65536]:
  for dark in [0,16384]:
   for extra in [0,32768]:
    for unchanged in [False,True]:
     body=dict(flash=flash,fade=fade,dark=dark,extra=extra)
     for offset,value in [(0x12484,flash),(0x12488,dark),(0x1248c,fade)]:write(context+offset,value)
     for offset,value in [(0x274,flash if unchanged else -1),(0x278,max(dark,extra) if unchanged else -1),(0x27c,fade if unchanged else -1),(0x28c,extra)]:write(owner+offset,value)
     for dest in destinations:cpu.mem_write(dest,bytes(0x1000))
     sp=stack+0xf000;write(sp,stop);calls.clear();cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
     cpu.emu_start(0x4a27b0,stop,count=100000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Palette did not return')
     palettes=[[list(struct.unpack('<3h',cpu.mem_read(dest+12+i*6,6))) for i in range(16)] for dest in destinations]
     cases.append({'input':body,'unchanged':unchanged,'calls':list(calls),'palettes':palettes,'cached':[signed(read(owner+o)) for o in [0x274,0x278,0x27c]]})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004A27B0 plus004ADFC0','method':'Original full palette copying, blend selection, range-limited RGB interpolation, clamp, fixed multiply and change gate execute unchanged. Graphics palette getters/submission captured.','colors':colors,'ranges':ranges,'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} palette transformations');print(cases[0]['calls'])
