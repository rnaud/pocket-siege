"""Execute original event-ring append/read/copy/reset sequences and full-buffer boundaries."""
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


def invoke(entry,receiver,args=()):
 sp=stack+0xf000;write(sp,stop)
 for i,v in enumerate(args):write(sp+4+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,receiver)
 cpu.emu_start(entry,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 return cpu.reg_read(UC_X86_REG_EAX)
coverage=dict(wrap=0,full=0,partialCopy=0,oversizedRead=0,drained=0)
cases=[]
for seed in range(128):
 initial=bytearray((i*13+seed)&255 for i in range(0x8000));cpu.mem_write(owner,bytes(initial))
 capacities=[32,64,128,512]
 for q in range(2):
  buffer=owner+0x100+q*0x40;write(owner+q*8,0x526544);write(owner+q*8+4,buffer)
  for o,v in [(0,0x5266a0),(4,owner+0x1000+q*0x2000),(8,capacities[(seed+q)%4]),(12,0),(16,0),(20,0),(24,0),(28,0)]:write(buffer+o,v)
 initial=bytes(cpu.mem_read(owner,0x8000));operations=[];state=seed+1;saved=[0,0]
 for step in range(96):
  state=(state*1664525+1013904223)&0xffffffff;q=(state>>16)&1;kind=['append','append','consume','peek','read','copy','contains','reset','usage','count'][((state>>20)%10)]
  wrapper=owner+q*8;buffer=read(wrapper+4);opargs=[]
  beforeCount=read(buffer+28);beforeCursor=read(buffer+12);head=read(buffer+24);headSize=read(head) if head else 0
  if kind=='append':
   size=[0,1,2,3,4,7,20,292,293,500][(state>>8)%10];event=state;payload=[(seed+step*17+i*3)&255 for i in range(size)]
   cpu.mem_write(owner+0x7000,bytes(payload));result=invoke(0x49c7f0,wrapper,[event,size,owner+0x7000]);opargs=[event,payload]
   if result:saved[q]=read(buffer+20)+8
  elif kind in ['peek','read']:result=invoke(0x49c720 if kind=='peek' else 0x49c780,wrapper,[0,owner+0x6000,owner+0x6004,owner+0x6100])
  elif kind=='consume':result=invoke(0x4af410,buffer)
  elif kind=='copy':
   source=(state>>12)&1;opargs=[source];result=invoke(0x4af4f0,buffer,[read(owner+source*8+4)])
  elif kind=='contains':
   address=saved[q] if state&1 else owner+0x4444;opargs=[address];result=invoke(0x4af440,buffer,[address])
  elif kind=='reset':invoke(0x4af390,buffer);result=None
  elif kind=='usage':result=invoke(0x4af3c0,buffer)
  else:result=invoke(0x4af3b0,buffer)
  if kind=='append' and not result:coverage['full']+=1
  if kind=='append' and result and read(buffer+12)<beforeCursor:coverage['wrap']+=1
  if kind=='copy' and not result and read(buffer+28)>beforeCount:coverage['partialCopy']+=1
  if kind in ['peek','read'] and not result and headSize>296:coverage['oversizedRead']+=1
  if kind in ['consume','read'] and result and read(buffer+28)==0:coverage['drained']+=1
  operations.append(dict(kind=kind,q=q,args=opargs,result=result,sha256=hashlib.sha256(cpu.mem_read(owner,0x8000)).hexdigest()))
 cases.append(dict(seed=seed,capacities=[capacities[seed%4],capacities[(seed+1)%4]],operations=operations))
args.output.write_text(json.dumps(dict(executableSha256=digest,routines='0049C7F0/0049C720/0049C780/004AF390..004AF4F0',coverage=coverage,cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'event-buffer sequences')
print(coverage)
assert all(coverage.values())
