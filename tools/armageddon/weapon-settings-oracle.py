"""Execute original weapon-settings expansion including special-weapon preparation."""
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


def skip(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
for entry in [0x419150,0x419840,0x417750]:cpu.hook_add(UC_HOOK_CODE,skip,begin=entry,end=entry)
inputs=[]
for level in range(5):
 for flags in range(16):
  scheme=[(i*31+level*19)&255 for i in range(216)]
  for offset in range(0x25,216,4):scheme[offset]=((offset//4)+level)%5
  for i in range(4):scheme[0x1e+i]=(flags>>i)&1
  scheme[0x22]=level%2;inputs.append(scheme)
for row in json.loads(Path('src/armageddon/scheme-data.json').read_text())['schemes']:inputs.append(row['bytes'])
cases=[]
for scheme in inputs:
 initial=bytearray((i*11+5)&255 for i in range(0x1c4));initial[0x14:0xec]=bytes(scheme)
 cpu.mem_write(0x6f454c,bytes(initial));cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
 cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x415540,0x417268,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==0x417268
 cases.append(dict(initial=bytes(initial).hex(),prepared=bytes(cpu.mem_read(0x6f454c,0x1c4)).hex(),sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00415540..00417268',method='Original scheme preparation and weapon-settings writes execute unchanged; team/starting-order/loadout stages skipped explicitly. Stops before CRT time reseed. Complete scheme and setup bytes compared for all built-ins and valid power-level/override combinations.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} weapon settings expansions')
