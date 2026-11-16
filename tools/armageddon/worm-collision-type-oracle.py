"""Execute the state-to-collision-type dispatch in original004D7730."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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

vtable, setter = owner+0x3000, owner+0x3400
write(vtable+0x54,setter)
# Supply only the virtual type setter; execute both original dispatch tables.
cpu.mem_write(setter, bytes.fromhex('8b44240489413cc20400'))
cases=[]
for state in list(range(256))+[-1,0x100,0x7fffffff,-0x80000000]:
    write(owner+0x3c,0xffffffff)
    cpu.reg_write(UC_X86_REG_EBX,owner)
    cpu.reg_write(UC_X86_REG_EBP,vtable)
    cpu.reg_write(UC_X86_REG_ESI,state & 0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4d79c0,0x4d7a09,count=100)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4d7a09:raise RuntimeError('Dispatch did not finish')
    cases.append(dict(state=state,type=read(owner+0x3c)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D79C0..004D7A09 state dispatch with captured virtual type setter.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} state dispatch cases')
