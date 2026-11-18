"""Execute native initial and between-round starting-team selection."""
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


cpu.mem_write(0x4190c0,b'\xc3')
def hook(cpu,address,size,user):
 global used
 cpu.reg_write(UC_X86_REG_EAX,seeds[used%len(seeds)]);used+=1
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x4190c0,end=0x4190c0)
def run(entry):
 sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
cases=[]
for banks,mapping in [(1,[0]),(1,[0,0,0,0,0,0]),(2,[0,1,0,1]),(3,[0,0,2]),(6,[5,4,3,2,1,0]),(3,[]),(3,[255,0,2])]:
 for seed in [0,1,2,0x7fffffff,0x80000000,0xffffffff]:
  for initial in [0,127,128,255]:
   writes=[[0xcd74,banks],[0x11a,len(mapping)],[0xd42a,initial]]+[[0x11f+i*3000,bank] for i,bank in enumerate(mapping)]+[[0xcd76+i*0x11e,initial] for i in range(banks)]
   cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
   for offset,value in writes:cpu.mem_write(owner+offset,bytes([value]))
   seeds=[seed,(seed+0x70000001)&0xffffffff,(seed-1)&0xffffffff];used=0;steps=[]
   for entry in [0x4198d0,0x419840,0x4198d0,0x4198d0]:
    run(entry);steps.append(dict(entry=f'{entry:08X}',seed_calls=used,sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
   cases.append(dict(writes=writes,seeds=seeds,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00419840 /004198D0',method='Full original initial selection and round rotation execute; persistent frontend seed service004190C0 supplied. Every setup byte and seed-call count compared after each step.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} starting-order sequences')
