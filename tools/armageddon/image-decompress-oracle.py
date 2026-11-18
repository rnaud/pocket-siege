"""Execute original terrain-file reader with explicit CRT and image interfaces."""
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
for pattern in [0,0xa5]:
 for mapping in [0,1,2]:
  for length in [0,1,2,7,15]:
   for distance in [1,2,17,255,256,2047]:
    for extra in ([0,1,255] if length==0 else [0]):
     cpu.mem_write(owner,bytes([pattern])*0x10000)
     palette=owner+0x100;source=owner+0x2000;destination=owner+0x8000
     table=bytes((i if mapping==0 else 255-i if mapping==1 else i*37)&255 for i in range(256))
     cpu.mem_write(palette,table)
     prefix=bytes(i%128 for i in range(2048))
     encoded=distance-1 if length else distance
     stream=prefix+bytes([0x80|(length<<3)|(encoded>>8),encoded&255])+(bytes([extra]) if not length else b'')+bytes([0x80,0])
     cpu.mem_write(source,stream)
     sp=stack+0xf000;write(sp,stop);write(sp+4,destination);write(sp+8,source);write(sp+12,palette)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4ab3c9,stop,count=50000)
     assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(pattern=pattern,mapping=mapping,length=length,distance=distance,extra=extra,sha256=hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004AB3C9',method='252 original executions compare complete64KiB memory for palette-translated literals, overlapping short and extended back references, maximum lengths, distance boundaries and terminator. Native decoder executes without hooks.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} image decompression sequences')
