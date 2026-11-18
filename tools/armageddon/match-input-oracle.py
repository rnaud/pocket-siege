"""Execute runtime actor teardown with original base/physics/text destruction and scene bookkeeping."""
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


import base64,zlib,itertools
context=0x2300000;cpu.mem_map(context,0x20000)
wrapper=owner+0x3000;inner=wrapper+32;storage=owner+0x3100;keyboard=owner+0x4000
calls=[];mutation=0;pressed=0
def callback(cpu,entry,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if entry==stop+0x100:
  target=cpu.reg_read(UC_X86_REG_ECX);calls.append(['dispatch',target,read(sp+4),read(sp+8),read(sp+12),read(read(sp+16))])
  if target==owner+0x1000:
   if mutation==1:write(owner+0x19c,0)
   elif mutation==2:write(owner+20,0)
   elif mutation==3:cpu.mem_write(context+0x1b88a,struct.pack('<h',42))
 elif entry==stop+0x200:calls.append(['key',cpu.reg_read(UC_X86_REG_ECX),read(sp+4)]);cpu.reg_write(UC_X86_REG_EAX,pressed)
 elif entry==stop+0x300:calls.append(['consume',cpu.reg_read(UC_X86_REG_ECX),read(sp+4)])
for address,argc in [(stop+0x100,4),(stop+0x200,1),(stop+0x300,1)]:
 cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4));cpu.hook_add(UC_HOOK_CODE,callback,begin=address,end=address)
cases=[]
for active,priorities,pressed,queueMode,mutation in itertools.product([0,1],[[],[42],[7,42],[7],[42,42],[-1]],[0,1],range(3),range(4)):
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(context,bytes(0x20000));calls.clear()
 write(owner+0x38,context);write(owner+0x19c,active);write(owner+0x284,-1 if priorities==[-1] else 42)
 write(owner+20,2);write(owner+24,owner+0x1300)
 for i in range(2):write(owner+0x1300+i*4,owner+0x1000+i*0x100);write(owner+0x1000+i*0x100,owner+0x1200)
 write(owner+0x1208,stop+0x100);write(context+4,keyboard);write(keyboard,keyboard+0x100);write(keyboard+0x104,stop+0x200);write(keyboard+0x10c,stop+0x300)
 cpu.mem_write(context+0x1b8aa,struct.pack('<h',len(priorities)))
 for i,value in enumerate(priorities):cpu.mem_write(context+0x1b88a+i*2,struct.pack('<h',value))
 write(wrapper,0x526544);write(wrapper+4,inner);write(inner,0x5266a0);write(inner+4,storage);write(inner+8,8 if queueMode==1 else 128)
 if queueMode==2:write(inner+12,120);write(inner+16,32)
 payload=owner+0x5000;write(payload,wrapper)
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000));sp=stack+0xf000
 for i,v in enumerate([stop,owner,0x3ec,0x124,payload]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4b4ce0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))
 cases.append(dict(mutation=mutation,pressed=pressed,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),sha256=hashlib.sha256(final).hexdigest(),calls=list(calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='288 original offline004B4CE0 event3EC captures with original base forwarding and ring-buffer append. Child dispatch and keyboard interfaces are observed; callbacks mutate activation, child count or input priority. Full192KiB root/queue/scene memory and call order compared, including queue allocation failure/wrap and Escape consumption. Online branch excluded.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'native match input sequences')
