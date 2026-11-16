"""Expand built-in scheme bytes through the native runtime-settings builder.

Collision predicates receive fixed-point coordinates and return explicit hit IDs.
No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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

schemes=json.loads(Path('src/armageddon/scheme-data.json').read_text())['schemes']
def skip(cpu,address,size,unused):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
for entry in [0x419150,0x419840,0x417750]:cpu.hook_add(UC_HOOK_CODE,skip,begin=entry,end=entry)
# Time/CRT seeding do not feed the selected settings region.
stub=stop+0x100;cpu.mem_write(stub,b'\x31\xc0\xc3')
write(0x517954,stub);write(0x517950,stub)
results=[]
for scheme in schemes:
    cpu.mem_write(owner,b'\x00'*0x10000)
    cpu.mem_write(0x6f454c,b'\x00'*0x300)
    cpu.mem_write(0x6f4560,bytes(scheme['bytes']))
    # Frontend handicap getter inputs are explicit zero, outside the scheme payload.
    write(0x6daf90+0xc8,0);write(0x6daf90+0xc0,0)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x415540,0x4175ea,count=100000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4175ea:raise RuntimeError('Settings builder did not finish')
    settings=list(cpu.mem_read(owner+0xd430,0x1e0))
    results.append({'resource_id':scheme['resource_id'],'language':scheme['language'],'bytes':settings})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'00415540..004175EA','context_offset':0x11b9c,'method':'Original scheme expansion; 216-byte resource payload at 006F4560. Team setup, starting-team RNG and inventory setup bypassed; no writes from those routines are included. CRT clock/seed calls return zero. Frontend handicap getters use explicit zero inputs. Captures only builder d430..d60f; mapped through input+0x3c and runtime copy to context+0x47a8.','schemes':results},indent=2)+'\n')
print(f'Expanded {len(results)} built-in schemes; friction bytes: {sorted(set(r["bytes"][4] for r in results))}')
