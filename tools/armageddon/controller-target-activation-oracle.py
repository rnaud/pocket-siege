"""Execute full005012C0 targeting activation with original004E8590 and replay ring writes; pointer sampling and busy query are interfaces."""
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

context=0x2300000;cpu.mem_map(context,0x20000)
keyboard=owner+0x1000;pointer=owner+0x2000;vtable=owner+0x3000;queue=owner+0x4000;ring=owner+0x4100;buffer=owner+0x5000
write(keyboard,vtable);write(pointer,vtable+0x100);write(vtable+4,stop+0x100)
for offset,address in [(4,stop+0x120),(8,stop+0x130),(12,stop+0x140)]:write(vtable+0x100+offset,address)
write(queue+4,ring)
for address,argc in [(stop+0x100,1),(stop+0x120,3),(stop+0x130,0),(stop+0x140,0),(0x4c32b0,2),(0x4c2d60,2),(0x4c2ee0,2),(0x4edc50,5)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
calls=[];keys=[];sample=[];busy=0;state=0;available=0

def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c32b0:
  calls.append(['busy',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,busy)
 elif address==0x4c2d60:
  calls.append(['state',read(sp+4),read(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4c2ee0:
  slot=read(sp+8);calls.append(['available',read(sp+4),slot]);cpu.reg_write(UC_X86_REG_EAX,int(slot==available))
 elif address==0x4edc50:
  calls.append(['sound']+[read(sp+i*4) for i in range(1,6)]);cpu.reg_write(UC_X86_REG_EAX,0)
 elif address==stop+0x100:
  key=read(sp+4);calls.append(['key',key]);cpu.reg_write(UC_X86_REG_EAX,int(key in keys))
 elif address==stop+0x120:
  calls.append(['pointer']);
  for i,value in enumerate(sample):write(read(sp+4+i*4),value&0xffffffff)
 elif address in [stop+0x130,stop+0x140]:calls.append(['resetA' if address==stop+0x130 else 'resetB'])
for address in [0x4c32b0,0x4c2d60,0x4c2ee0,0x4edc50,stop+0x100,stop+0x120,stop+0x130,stop+0x140]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for bits in range(64):
 for buttons in range(4):
  for capacity in [24,64]:
   cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);write(context+0x10,pointer)
   fields={0x3c:2,0x4c:3,0x84:bits&1,0x64:34 if bits&2 else 0,0xac:(bits>>2)&1,0x94:(bits>>3)&1,0x98:(bits>>4)&1}
   for offset,value in fields.items():write(owner+offset,value)
   busy=(bits>>5)&1;sample=[17,-23,buttons];calls=[]
   cpu.mem_write(ring,bytes(32));write(ring+4,buffer);write(ring+8,capacity);cpu.mem_write(buffer,bytes(capacity))
   sp=stack+0xf000;write(sp,stop);write(sp+4,queue);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x5012c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   events=[];node=read(ring+0x18)
   while node:
    length=read(node);events.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
   cases.append(dict(fields={str(k):v for k,v in fields.items()},sample=sample,busy=busy,capacity=capacity,calls=calls,events=events))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='005012C0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} targeting activation cases')
