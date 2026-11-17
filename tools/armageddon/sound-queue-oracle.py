"""Execute the original sound queue insertion and frame-drain instructions.

Runs full 004EDC90 and drain block 004A1C22..004A1CBB; backend calls are captured.
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

context = 0x2300000
cpu.mem_map(context, 0x20000)
write(owner+0x38,context); write(owner+0x2a0,context)
backend,vtable,submit=owner+0x1000,owner+0x2000,stop+0x100
write(backend,vtable);write(vtable+12,submit)
cpu.mem_write(submit,b'\xc2\x14\x00')
calls=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 calls.append(list(struct.unpack('<5i',cpu.mem_read(sp+4,20))))
cpu.hook_add(UC_HOOK_CODE,capture,begin=submit,end=submit)
cases=[]
for count in [0,1,15,16,17,32]:
 for disabled in [0,1]:
  for present in [0,1]:
   write(context+0x1cad4,0)
   inputs=[];accepted=[]
   for i in range(count):
    request=[i+100,(i*7)%10,65536+i,32768-i,-65536+i]
    inputs.append(request);sp=stack+0xf000
    for j,value in enumerate([stop,*request]):write(sp+j*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4edc90,stop,count=1000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    accepted.append(cpu.reg_read(UC_X86_REG_EAX))
   stored=[list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+i*20,20))) for i in range(read(context+0x1cad4))]
   write(context+0x1d448,disabled);write(context+12,backend if present else 0)
   calls=[]
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBX,0);cpu.reg_write(UC_X86_REG_ESP,stack+0xe000)
   cpu.emu_start(0x4a1c22,0x4a1cbb,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a1cbb
   cases.append(dict(inputs=inputs,accepted=accepted,stored=stored,disabled=disabled,present=present,calls=calls,remaining=read(context+0x1cad4)))
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),indent=2)+'\n')
print(f'Wrote {len(cases)} sound queue cases')
