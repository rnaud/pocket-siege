"""Execute original004A7660 terrain cut mask constructor with captured interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--image',type=Path,required=True)
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

source=json.loads(args.image.read_text())
source_object,source_table=owner+0x1000,owner+0x2000
write(source_object,source_table);write(source_table+0x54,0x492ac0);write(source_table+0x58,0x492b10)
bitmaps={};heap=owner+0x4000
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 global heap
 if address not in [0x492550,0x492bc0,0x492ac0,0x492b10]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+4*i);cleanup=0;obj=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x492550:
  cpu.reg_write(UC_X86_REG_EAX,heap);heap+=0x100
 elif address==0x492bc0:
  bitmaps[obj]={'width':arg(0),'height':arg(1),'points':set()};cpu.reg_write(UC_X86_REG_EAX,obj);cleanup=12
 elif address==0x492ac0:
  x,y=signed(arg(0)),signed(arg(1));cleanup=8
  if obj==source_object:value=source['pixels'][y*source['width']+x]
  else:value=int((x,y) in bitmaps[obj]['points'])
  cpu.reg_write(UC_X86_REG_EAX,value)
 elif address==0x492b10:
  x,y=signed(arg(0)),signed(arg(1));cleanup=12
  if obj==source_object:
   source['pixels'][y*source['width']+x]=arg(2)
   cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
  bitmap=bitmaps[obj]
  if 0<=x<bitmap['width'] and 0<=y<bitmap['height']:
   if arg(2):bitmap['points'].add((x,y))
   else:bitmap['points'].discard((x,y))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for region in [[200,3,219,26,209,17],[104,8,123,34,113,19],[136,8,155,27,145,19],[224,0,230,6,227,3]]:
 heap=owner+0x4000;bitmaps={};sp=stack+0xff00
 for i,v in enumerate([stop,*region,source_object]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4a7660,stop,count=2000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Mask constructor did not return')
 planes=[]
 for offset in [4,8]:
  bitmap=bitmaps[read(owner+offset)];planes.append(sorted(bitmap['points'],key=lambda p:(p[1],p[0])))
 cases.append(dict(region=region,width=read(owner+12),height=read(owner+16),anchorX=read(owner+20),anchorY=read(owner+24),hole=planes[0],rim=planes[1]))
# Run the complete table constructor, including its original mirror loop.
heap=owner+0x4000;bitmaps={};sp=stack+0xff00
write(sp,stop);write(sp+4,source_object)
cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
cpu.emu_start(0x4a7d50,stop,count=20000000)
if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Tool table constructor did not return')
tools={}
for tool_id in range(1,16):
 mask=read(owner+0x84+tool_id*4)
 tools[tool_id]=dict(width=read(mask+12),height=read(mask+16),anchorX=read(mask+20),anchorY=read(mask+24),
  hole=sorted(bitmaps[read(mask+4)]['points'],key=lambda p:(p[1],p[0])),
  rim=sorted(bitmaps[read(mask+8)]['points'],key=lambda p:(p[1],p[0])))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004A7D50 table construction and004A7660 with original masks.img pixels supplied through virtual getter, allocation/bitmap construction supplied, clipped bitmap setters captured.',cases=cases,tools=tools),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} isolated masks and {len(tools)} original table entries')
