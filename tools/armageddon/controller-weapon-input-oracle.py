"""Execute full 00502550 weapon input with original key classification and queue writes; external input/registry/worm queries are interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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

context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
keyboard=owner+0x1000;vtable=owner+0x3000;queue=owner+0x4000;ring=owner+0x4100;buffer=owner+0x5000;descriptor=owner+0x6000
write(context+4,keyboard);write(keyboard,vtable);write(vtable+4,stop+0x100);write(vtable+12,stop+0x110);write(queue+4,ring)
for address,argc in [(stop+0x100,1),(stop+0x110,1),(0x4c32b0,2),(0x4c2ee0,2),(0x4edad0,1)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
calls=[];keys=[];busy=0;available={}
def hook(cpu,address,size,user):
 global keys
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c32b0:
  calls.append(['busy',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,busy)
 elif address==0x4c2ee0:
  slot=read(sp+8);calls.append(['available',read(sp+4),slot]);cpu.reg_write(UC_X86_REG_EAX,int(slot in available))
 elif address==0x4edad0:
  slot=read(sp+4);calls.append(['category',slot]);write(descriptor+0x48,available[slot]);cpu.reg_write(UC_X86_REG_EAX,descriptor)
 elif address==stop+0x100:
  key=read(sp+4);calls.append(['key',key]);cpu.reg_write(UC_X86_REG_EAX,int(key in keys))
 elif address==stop+0x110:
  key=read(sp+4);calls.append(['consume',key]);keys=[k for k in keys if k!=key];cpu.reg_write(UC_X86_REG_EAX,0)
for address in [0x4c32b0,0x4c2ee0,0x4edad0,stop+0x100,stop+0x110]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def events():
 result=[];node=read(ring+0x18)
 while node:
  length=read(node);result.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
 return result
cases=[]
def run(fields,input_keys,inventory,busy_value=0,capacity=256):
 global keys,calls,available,busy
 keys=input_keys.copy();available=inventory;busy=busy_value
 fields={0x3c:2,0x4c:3,0x50:0,0x64:0,0x74:0,0x78:0,0x8c:0,0x90:0,0xa0:0,**fields}
 for offset,value in fields.items():write(owner+offset,value)
 cpu.mem_write(ring,bytes(32));write(ring+4,buffer);write(ring+8,capacity);cpu.mem_write(buffer,bytes(capacity));calls=[]
 sp=stack+0xf000;write(sp,stop);write(sp+4,queue);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x502550,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(fields={str(k):v for k,v in fields.items()},busy=busy,keys=input_keys,available=inventory,capacity=capacity,calls=calls,events=events()))
for category in range(1,13):
 for current in [0,1,35,70]:
  for capacity in [24,28,64,256]:
   run({0x64:current},[category+13],{1:category,35:category,70:category,5:13-category},capacity=capacity)
 run({},[category+13],{})
# Multiple category keys in one poll retain the current slot until command dispatch.
run({0x64:1},list(range(14,26)),{i:(i-1)%12+1 for i in range(1,71)},capacity=512)
for mode in range(4):
 for number_bits in range(32):
  for direction_bits in range(16):
   keys=[k for i,k in enumerate(range(5,10)) if number_bits&(1<<i)]+[k for i,k in enumerate([0x1f,0x20,0x21,0x1e]) if direction_bits&(1<<i)]
   run({0x8c:mode&1,0xa0:(mode>>1)&1,0x90:1},keys,{},capacity=[24,48,256][(number_bits+direction_bits)%3])
for bits in range(16):
 run({0x50:bits&1,0x74:(bits>>1)&1,0x78:(bits>>2)&1,0x90:1},[14,5,0x1f],{1:1},busy_value=(bits>>3)&1)
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='00502550',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} controller weapon input cases')
