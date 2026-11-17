"""Execute original loading-screen, font and team-color palette startup."""
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

root=Path(__file__).resolve().parents[2]
source=0x2400000;context=0x2800000
cpu.mem_map(source,0x400000);cpu.mem_map(context,0x20000)
view=owner+0x4000;graphics=owner+0x1000;gv=owner+0x2000;vv=owner+0x2100
sprite_object=owner+0x3000
get,submit,load_sprite,load_font,formatted,finish=[stop+0x100+i*0x10 for i in range(6)]
write(graphics,gv);write(gv+0x14,get);write(gv+0x54,submit);write(gv+0x70,load_sprite);write(gv+0x78,load_font)
write(view,vv);write(vv+4,0x4a6ff0);write(view+0x2b4,graphics);write(view+0x5cd0,context);write(context+8,graphics)
write(0x5178f4,formatted)
steps=[];continuation=None

def cstring(address):
 out=bytearray()
 while cpu.mem_read(address,1)!=b'\0':out+=cpu.mem_read(address,1);address+=1
 return out.decode('ascii')
def ret(value,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EAX,value)
 cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
def entries():
 n=struct.unpack('<h',cpu.mem_read(owner+0x90e,2))[0]
 used=struct.unpack('<'+'h'*n,cpu.mem_read(owner+0x910,n*2))
 return [[index,list(struct.unpack('<3h',cpu.mem_read(owner+12+index*6,6)))] for index in used]
def hook(cpu,address,size,user):
 global continuation
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==get:ret(owner,4)
 elif address==submit:steps.append({'kind':'submit','entries':entries()});ret(1,4)
 elif address in [0x492550,0x4a7340]:ret(0,4 if address==0x4a7340 else 0)
 elif address==formatted:
  fmt=cstring(read(sp+8));a=cstring(read(sp+12));b=cstring(read(sp+16))
  value=(fmt%(a,b)).encode()+b'\0';cpu.mem_write(read(sp+4),value);ret(len(value)-1)
 elif address in [load_sprite,load_font]:
  font=address==load_font;name=cstring(read(sp+20)).replace('\\','/').lower()
  path='public/armageddon/'+('fonts/' if font else 'sprites/')+name
  raw=(root/path).read_bytes();cpu.mem_write(source,raw)
  steps.append({'kind':'font' if font else 'sprite','path':path,'id':read(sp+12),'sha256':hashlib.sha256(raw).hexdigest()})
  continuation=(read(sp),sp+(24 if font else 28))
  write(sp,finish);write(sp+4,owner);write(sp+8,source)
  cpu.reg_write(UC_X86_REG_ECX,sprite_object);cpu.reg_write(UC_X86_REG_EIP,0x4b04b0 if font else 0x4af790)
 elif address==finish:
  steps[-1]['entries']=entries()
  target,sp=continuation;cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_ESP,sp)
cpu.hook_add(UC_HOOK_CODE,hook)
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Startup did not return')
call(0x4adac0,[0,104],owner)
cpu.mem_write(owner+0x2200,bytes(6));call(0x4adcb0,[owner+0x2200],owner)
call(0x4a6b10,[],view)
font_entries=entries()
call(0x4a68e0,[owner],view)
team_indices=[read(context+0x12438+i*4) for i in range(9)]
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004A6B10/004A68E0',
 'method':'Original startup, palette clone, sprite table loader, FNT/SPR parsers, team-color allocator and palette helpers execute unchanged. File/graphics interfaces dispatch the real parsers, heap bitmap-wrapper allocation returns null, presentation/progress is captured or skipped.',
 'steps':steps,'fontEntries':font_entries,'entries':entries(),'teamIndices':team_indices},separators=(',',':'))+'\n')
print(f'Captured {len(steps)} startup operations and team colors')
