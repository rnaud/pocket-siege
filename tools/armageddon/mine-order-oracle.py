"""Execute original render-order pool initialization, mine allocation and release."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

from unicorn.x86_const import UC_X86_REG_EDI
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
def signed(v):return v if v<0x80000000 else v-0x100000000
def snapshot():return dict(free=[read(context+0x828+i*4) for i in range(read(context+0xc28))],active=[read(context+0xc2c+i*4) for i in range(read(context+0x102c))],orders=[signed(read(context+0x1030+i*4)) for i in range(256)])
cpu.reg_write(UC_X86_REG_ESI,context);cpu.emu_start(0x4a5386,0x4a53c8,count=10000)
initial=snapshot();cases=[];handles=[]
for operation in ['allocate']*6+['remove','allocate','remove','remove','allocate','allocate']:
 before=snapshot();sp=stack+0xfe00;cpu.reg_write(UC_X86_REG_ESP,sp)
 if operation=='allocate':
  cpu.reg_write(UC_X86_REG_EBX,owner);cpu.emu_start(0x4e944a,0x4e9512,count=10000);index=signed(read(owner+0x110));handles.append(index)
 else:
  index=handles.pop(len(handles)//2);write(owner+0x110,index);write(owner+0x100,0)
  cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e9790,0x4e986e,count=10000)
 cases.append(dict(operation=operation,before=before,index=index,after=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004A5386..004A53C8 initialization,004E944A..004E9512 allocation/promotion and004E9790..004E986E release execute unchanged without hooks.',initial=initial,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} render-order pool operations')
