"""Execute original mission owner construction and resource tables."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE, UC_HOOK_MEM_WRITE
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


cpu.mem_map(0,0x1000)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
write(0x517954,stop+0x100);write(0x517950,stop+0x200)
def hook(cpu,address,size,user):
 global phase
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d48:
  dest=cpu.reg_read(UC_X86_REG_ECX);calls.append(['string',dest,snapshot()]);write(dest,0x2400000);ret(dest)
 elif address==stop+0x100:
  calls.append(['time',read(sp+4),snapshot()]);phase=1
  if mutation:write(owner+0x54,123456)
  ret(timestamp)
 elif address==stop+0x200:
  calls.append(['seed',read(sp+4),snapshot()])
  if mutation:write(owner+0x884,789);write(owner+0x87c,321);write(owner+0x880,0x2400100)
  ret()
def onwrite(cpu,access,address,size,value,user):
 assert size==4
 writes[phase].append([address-owner,value&0xffffffff])
cpu.hook_add(UC_HOOK_MEM_WRITE,onwrite,begin=owner,end=owner+0xffff)
for address in [0x503d48,stop+0x100,stop+0x200]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[];expected=None
for pattern in [0,0xa5,0xff]:
 for timestamp in [0,1,0x7fffffff,0x80000000,0xffffffff]:
  for mutation in [0,1]:
   cpu.mem_write(owner,bytes([pattern])*0x10000);calls=[];writes=[[],[]];phase=0
   sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x43d6c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   if expected is None:expected=writes
   assert writes==expected
   cases.append(dict(pattern=pattern,timestamp=timestamp,mutation=mutation,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX),sha256=snapshot()))
Path('src/armageddon/mission-owner-tables.json').write_text(json.dumps(dict(executableSha256=digest,beforeTime=expected[0],afterSeed=expected[1]),indent=2)+'\n')
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} constructors, {len(expected[0])} table writes and {len(expected[1])} final writes')
