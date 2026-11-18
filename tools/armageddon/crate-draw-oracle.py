"""Execute complete native crate draw requests, including content and fuse labels."""
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

context=0x3000000;cpu.mem_map(context,0x20000)
vt=owner+0x1000;name=owner+0x2000
write(owner,vt);write(owner+0x38,context);write(owner+0x100,3)
for off,addr,argc in [(0x5c,stop+0x100,2),(0x7c,stop+0x200,0),(0xf8,stop+0x300,0)]:
 write(vt+off,addr);cpu.mem_write(addr,b'\xc2'+struct.pack('<H',argc*4))
for addr,argc in [(0x4edb70,1),(0x4edad0,1),(0x4c67a0,7),(0x4eed70,10),(0x4eedf0,6)]:cpu.mem_write(addr,b'\xc2'+struct.pack('<H',argc*4))
for addr in [0x4aa8f0,0x4aab40]:cpu.mem_write(addr,b'\xc3')
write(owner+0x268,88);write(owner+0x270,99)
def string(address):
 out=[]
 while cpu.mem_read(address,1)[0]:out.append(cpu.mem_read(address,1)[0]);address+=1
 return bytes(out).decode()
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 def arg(i):return signed(read(sp+i*4))
 if address==stop+0x100:
  calls.append(['position']);write(read(sp+4),body['x']);write(read(sp+8),body['y'])
 elif address==stop+0x200:cpu.reg_write(UC_X86_REG_EAX,body['state'])
 elif address==stop+0x300:
  calls.append(['submerged']);cpu.reg_write(UC_X86_REG_EAX,body['submerged'])
 elif address==0x4aa8f0:
  calls.append(['special',arg(1)]);cpu.reg_write(UC_X86_REG_EAX,special)
 elif address==0x4edb70:
  calls.append(['palette',arg(1)]);cpu.reg_write(UC_X86_REG_EAX,0x2000+arg(1))
 elif address==0x4edad0:
  calls.append(['name',arg(1)]);cpu.mem_write(name+4,f'Weapon {arg(1)}'.encode()+b'\0');cpu.reg_write(UC_X86_REG_EAX,name)
 elif address==0x4aab40:
  calls.append(['format',arg(2)]);cpu.mem_write(read(sp+4),str(arg(2)).encode()+b'\0')
 elif address==0x4c67a0:
  slot=cpu.reg_read(UC_X86_REG_ECX);text=string(read(sp+4))
  calls.append(['raster',slot,text,arg(2),arg(3),arg(4),arg(7)])
  write(read(sp+20),len(text)*8);write(read(sp+24),16);cpu.reg_write(UC_X86_REG_EAX,0x5000+slot)
 elif address==0x4eed70:calls.append(['image']+[arg(i) for i in range(1,11)])
 elif address==0x4eedf0:calls.append(['sprite']+[arg(i) for i in range(1,7)])
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for kind in range(1,6):
 for state in [100,101,102,103]:
  for fuse in [0,1,1000,2999,3000,4500,-1,2147483647]:
   for frame in [0,24,25,50]:
    mode=(kind+state+frame)%5;labels=(frame!=24);special=kind%2
    body=dict(contentLabel=88,fuseLabel=99,kind=kind,state=state,fuse=fuse,submerged=int(state==102),x=1234567,y=-765432,rank=kind-3,content=kind+10,progress=0x18001,openingProgress=0x4000,variant=frame%2,targetStyle=frame%2)
    for key,off in [('kind',0x124),('fuse',0x10c),('content',0x12c),('progress',0x264),('openingProgress',0x108),('variant',0x25c),('targetStyle',0x250)]:write(owner+off,body[key])
    for off,value in [(0x1030+12,body['rank']),(0x1b76c,mode),(0x1be98,int(labels)),(0x1b8ec,frame)]:write(context+off,value)
    calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4e0cc0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(body=body,scene=dict(labelMode=mode,showContents=labels,frame=frame),special=special,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004E0CC0 with real004E0880',method='Original draw orchestration and sprite resolution execute unchanged. Position/state/submersion, palette/content queries, number formatting, text rasterization and queue submission are observed interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} crate render sequences')
