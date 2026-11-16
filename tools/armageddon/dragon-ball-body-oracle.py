"""Execute original004D3660 Dragon Ball construction with captured interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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
owner, stack, stop, packet = 0x2000000, 0x2100000, 0x2200000, 0x2300000
for address in [owner, stack, stop, packet]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<i',cpu.mem_read(address,4))[0]
def hook(cpu,address,size,user):
 if address not in [0x4ed970,0x4b19e0,0x4eebe0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 count=0 if address==0x4eebe0 else 1
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
fields={'x':0x3c,'y':0x40,'progress':0x44,'releaseSound':0x48,'sound':0x4c,'sprite':0x50,'damage':0x54,'angle':0x58,'push':0x5c,'remaining':0x60,'direction':0x74}
cases=[]
records=[[99,100,676,30,60,75,700],[0]*7,[-1,0x7fffffff,-2147483648,255,-90,-100,-1]]
for words in records:
 for direction in [-65536,0,65536]:
  for x,y in [(0,0),(123456789,-987654321),(-2147483648,2147483647)]:
   launch=[2,3,x,y,direction,0,11,12,13,14,15]
   for i,value in enumerate(launch):write(packet+i*4,value)
   cpu.mem_write(owner,b'\xaa'*0x90)
   sp=stack+0xff00
   for i,value in enumerate([stop,123,*words,packet]):write(sp+i*4,value)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   cpu.emu_start(0x4d33c0,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Constructor failed to return')
   output={key:read(owner+offset) for key,offset in fields.items()}
   output['launch']=[read(owner+0x64+i*4) for i in range(11)]
   record={hex(0x70+i*4):value for i,value in enumerate(words)}
   cases.append(dict(record=record,launch=launch,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D33C0 constructor field writes. Base004ED970, type registration004B19E0 and scheduler004EEBE0 are supplied interfaces; native task lifecycle is not asserted.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Dragon Ball constructors')
