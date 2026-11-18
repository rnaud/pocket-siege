"""Execute original FNT memory parser, palette allocation and raw pixel remapping."""
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
owner, stack, stop, source = 0x2000000, 0x2100000, 0x2200000, 0x2400000
for address,length in [(owner,0x10000),(stack,0x10000),(stop,0x1000),(source,0x400000)]:cpu.mem_map(address,length)
def write(address,value):cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address):return struct.unpack('<I',cpu.mem_read(address,4))[0]
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Parser did not return')
 return cpu.reg_read(UC_X86_REG_EAX)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(source,len(raw)))+bytes(cpu.mem_read(0x5602e4,16))).hexdigest()
root=Path(__file__).resolve().parents[2]
cases=[]
raw_example=bytearray(struct.pack('<IIHH',0x1a544e46,0,0x8008,2)+bytes([10,20,30,10,20,30]))
raw_example+=bytes(range(256))+struct.pack('<hH',-7,1)
while len(raw_example)%4:raw_example+=b'\xa5'
raw_example+=struct.pack('<I4h',0,-2,0,2,2)+bytes([0,1,2,1,2,0,1,2,2,1,0])
struct.pack_into('<I',raw_example,4,len(raw_example))
for path in ['public/armageddon/fonts/smlwht1.fnt','public/armageddon/fonts/stdwht2.fnt',None]:
 raw=(root/path).read_bytes() if path else bytes(raw_example)
 for pattern in [0,165]:
  for last in [2,254]:
   cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(source,raw)
   cpu.mem_write(0x5602e4,struct.pack('<4I',0xfffffff0,17,0xfffffff0,23))
   call(0x4adac0,[1,last],owner)
   result=call(0x4b04b0,[owner,source],owner+0x3000)
   cases.append({'path':path,'raw':None if path else raw.hex(),'sha256':hashlib.sha256(raw).hexdigest(),'pattern':pattern,'last':last,'result':result,'state':snapshot()})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B04B0','method':'Original FNT parser, palette allocator and raw pixel remapping execute unchanged without service hooks. Full owner, source and resource counters are hashed on return.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} FNT parser cases')
