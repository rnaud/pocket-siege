"""Execute original in-game palette allocation, reads and enumeration."""
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

# Graphics manager availability is initialized by00496F60: indices0..254 free,
# index255 unavailable. Platform window/DirectDraw initialization is not executed.
heap=0x2300000
cpu.mem_map(heap,0x20000)
next_alloc=heap
fail_alloc=False
vtable=owner+0x7000
view=owner+0x8000
write(vtable+0x10,0x497750);write(vtable+0x14,0x497850)
def ret(value,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 cpu.reg_write(UC_X86_REG_EAX,value)
 cpu.reg_write(UC_X86_REG_EIP,read(sp))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
def hook(cpu,address,size,user):
 global next_alloc
 if address==0x492550:
  value=0 if fail_alloc else next_alloc
  if value:next_alloc+=0x1000
  ret(value)
 elif address==read(0x5265f0):ret(0,4) # palette destruction interface
cpu.hook_add(UC_HOOK_CODE,hook)
def call(entry,values,receiver=owner):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=500000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Bank routine did not return')
 return signed(cpu.reg_read(UC_X86_REG_EAX))
def reset():
 global next_alloc
 cpu.mem_write(owner,bytes(0x6000));cpu.mem_write(heap,bytes(0x20000));next_alloc=heap
 write(owner,vtable);write(view+0x2b4,owner)
 for index in range(255):write(owner+0x464+index*4,1)
def snapshot():
 banks=[]
 for bank in range(8):
  pointer=call(0x497850,[bank])
  banks.append([signed(read(pointer+4)),signed(read(pointer+8))] if pointer else None)
 return {'banks':banks,'available':[read(owner+0x464+i*4) for i in range(256)],
 'references':[read(owner+0x4b04+i*4) for i in range(8)]}
cases=[]
sequences=[ [('allocate',1,105),('allocate',2,32),('allocate',3,112)],
 [('allocate',0,4),('allocate',8,4),('release',1),('allocate',1,4),('allocate',1,5)],
 [('allocate',1,4),('allocate',2,8),('release',1),('allocate',3,2),('release',2),('allocate',4,6)],
 [('allocate',1,4),('references',1,2),('release',1),('references',1,0),('release',1)],
 [('fail',1,8),('allocate',1,8)], [('allocate',1,255),('allocate',2,1)],
 [('allocate',1,0),('release',1)], [('release',0),('release',8)] ]
for sequence in sequences:
 reset();steps=[]
 for op in sequence:
  fail_alloc=op[0]=='fail'
  if op[0]=='references':write(owner+0x4b04+op[1]*4,op[2]);result=None
  else:result=call(0x497870 if op[0]=='release' else 0x497750,list(op[1:]))
  steps.append({'operation':op,'result':result,**snapshot()})
 cases.append(steps)
fail_alloc=False
reset();call(0x4a6a70,[],view);setup=snapshot()
pointer=call(0x497850,[1]);setup['blackIndex']=struct.unpack('<h',cpu.mem_read(pointer+0x910,2))[0]
setup['usedCount']=struct.unpack('<h',cpu.mem_read(pointer+0x90e,2))[0]
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'00497750/00497850/00497870/004A6A70',
 'method':'Original bank allocation/get/release and full gameplay bank setup execute unchanged, including real palette constructor/add/range helpers. Only heap allocation and destructor interfaces are stubbed. Availability initialized from00496F60; platform initialization excluded.',
 'cases':cases,'setup':setup},separators=(',',':'))+'\n')
print(f'Captured {sum(map(len,cases))} bank operations and full game setup')
