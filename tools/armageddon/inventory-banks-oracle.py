"""Execute native banked inventory primitives and special availability."""
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


cases=[]
for banks in [[0,1],[2,2],[5,0]]:
 for count in [-1,0,3,2147483647]:
  for delay in [0,1,-1]:
   for bypass in [0,1]:
    for health in [[0,0],[1,0],[1,1],[0,10,20]]:
     writes=[[8+team*0x51c,bank] for team,bank in zip([1,2],banks)]
     writes += [[0x2c10,bypass],[0x51c,len(health)]]
     writes += [[0x51c-0x49c+i*0x9c,hp] for i,hp in enumerate(health)]
     for bank in set(banks):
      for slot in [0,6,59,70]:writes += [[0x1eb8+(slot+bank*0x8e)*4,count],[0x1fd4+(slot+bank*0x8e)*4,delay]]
     cpu.mem_write(owner,bytes(0x2c14))
     for off,value in writes:write(owner+off,value)
     operations=[['available',1,59],['available',2,6],['add',1,6,2],['available',2,6],['spend',2,6],['set',1,70,-7],['add',1,70,5],['set',2,0,2147483647],['add',2,0,1],['add',1,6,-3],['spend',1,6],['available',1,6]]
     steps=[]
     for op in operations:
      sp=stack+0xf000
      for i,value in enumerate([stop,*op[1:]]):write(sp+i*4,value)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
      cpu.emu_start(dict(available=0x4c2ee0,set=0x4c2f70,add=0x4c2fb0,spend=0x4c3010)[op[0]],stop,count=10000)
      assert cpu.reg_read(UC_X86_REG_EIP)==stop
      steps.append(dict(operation=op,result=signed(cpu.reg_read(UC_X86_REG_EAX)) if op[0]=='available' else None,sha256=hashlib.sha256(cpu.mem_read(owner,0x2c14)).hexdigest()))
     cases.append(dict(writes=writes,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004C2EE0 / 004C2F70 / 004C2FB0 / 004C3010',method='Full original functions execute without substitutions. Compare every inventory byte after ordered operations; distinct/shared banks, delays/bypass, special slot59 living-worm gate, unlimited counts and signed overflow.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} banked inventory sequences')
