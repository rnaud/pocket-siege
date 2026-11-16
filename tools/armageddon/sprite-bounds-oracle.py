"""Execute original sprite crop/anchor getter 004AFB00 with shipped SPR metadata."""
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
def invoke(address, arguments):
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<I',value&0xffffffff) for value in arguments))
    cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'Instruction limit: {address:08x}')
    return cpu.reg_read(UC_X86_REG_EAX)


root=Path(__file__).resolve().parents[2]/'public/armageddon/sprites'
cases=[]
for name in ['wbrth1','wblink1','wwalk','wjump','wfall','wland1','wfly1','wroll','wslide','wtwang','wsldlk1','wsldlk2','wdie','wwinner','wbaz','wthrgrn','wminlnk','wicelk3','wicelk2','wicestnd']:
 sprite=(root/(name+'.spr')).read_bytes()
 p=12+struct.unpack_from('<H',sprite,10)[0]*3
 if sprite[9]&64:
  blocks=struct.unpack_from('<H',sprite,p)[0];p=((p+5)&~3)+blocks*12
 rate,flags,width,height,count=struct.unpack_from('<I4H',sprite,p)
 cpu.mem_write(owner,bytes(0x100));cpu.mem_write(owner+8,struct.pack('<4H',width,height,flags,count));write(owner+0x14,owner+0x1000)
 cpu.mem_write(owner+0x1000,sprite[p+12:p+12+count*12])
 span=count*2-1 if flags&2 else count
 progresses=sorted(set([-65536,-1,0,32768,65535,65536,65537]+[(i*65536+span-1)//span for i in range(span)]))
 samples=[]
 for progress in progresses:
  invoke(0x4afb00,[progress]+[owner+0x3000+i*4 for i in range(6)])
  width_out,height_out,anchor_x,anchor_y,zero1,zero2=struct.unpack('<6i',cpu.mem_read(owner+0x3000,24))
  samples.append(dict(progress=progress,index=read(owner+0x34),width=width_out,height=height_out,anchorX=anchor_x,anchorY=anchor_y))
 cases.append(dict(name=name,sha256=hashlib.sha256(sprite).hexdigest(),samples=samples))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original 004AFB00, real SPR header and per-frame rectangles, no mocked functions.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {sum(len(c["samples"]) for c in cases)} original frame bounds across {len(cases)} sprites')
