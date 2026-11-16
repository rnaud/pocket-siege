"""Execute original smoke emission and motion instructions in Unicorn.

Original smoke emission and motion instructions execute; RNG is supplied and playback is captured. No game entry point runs.
"""
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
cpu.mem_write(0x4ccf50,b'\xb8\x01\x00\x00\x00\xc2\x08\x00')
cpu.mem_write(0x492550,b'\xb8\x01\x00\x00\x00\xc3')
cpu.mem_write(0x4d4f10,b'\xc2\x08\x00')
cpu.mem_write(0x4b26f0,b'\xc2\x10\x00')
cpu.mem_write(0x4b26a0,b'\xc2\x18\x00')
vtable,destroy=owner+0x3000,owner+0x5000
write(owner,vtable);write(vtable,destroy)
state={}
def capture(cpu,address,size,user):
 if address==0x4d4f10:
  sp=cpu.reg_read(UC_X86_REG_ESP);ptr=read(sp+8)
  state['requests'].append(list(struct.unpack('<7i',cpu.mem_read(ptr,28))))
 elif address==0x4b26a0:
  sp=cpu.reg_read(UC_X86_REG_ESP);ptr=read(sp+24)
  state['effects'].append(list(struct.unpack('<12i',cpu.mem_read(ptr,48))))
 elif address==destroy:state['alive']=False;cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE,capture)
def run(address,args):
 sp=stack+0xf000;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+i*4,value&0xffffffff)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(address,stop,count=50000)
cases=[]
for mode in [0,1,2,3,4,5,6]:
 for strength in [5,39,40,59,60,79,80,100]:
  for seed in [0,42]:
   write(context+0x1ad0,seed)
   for i,n in enumerate([0,1,2,3]):write(context+0x1ad8+i*4,n)
   write(context+0x1b18,4);write(context+0x1b5c,0)
   sequence=[]
   for j in range(5 if mode==1 and strength>=40 else 1):
    state.clear();state.update(requests=[],effects=[])
    run(0x4ee1d0,[mode,100<<16,200<<16,strength])
    sequence.append(dict(smoke=list(state['requests']),effects=list(state['effects']),random=read(context+0x1ad0),available=[read(context+0x1ad8+i*4) for i in range(read(context+0x1b18))],used=[read(context+0x1b1c+i*4) for i in range(read(context+0x1b5c))]))
   cases.append(dict(mode=mode,strength=strength,seed=seed,x=100<<16,y=200<<16,sequence=sequence))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004EE1D0',method='Original emitter/trig/LCG/effect shuffle execute unchanged; smoke allocations and 0x43E effect payloads captured. Bag initialized to four impact variants.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} effect sequences')
