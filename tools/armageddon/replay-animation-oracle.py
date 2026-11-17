"""Execute original playback entry branch, with snapshot/device/audio interfaces isolated."""
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

stream=owner+0x1000;buffer=owner+0x2000
write(stream+4,buffer)
def invoke(address,this,arguments=[]):
 sp=stack+0xf000;write(sp,stop)
 for i,value in enumerate(arguments):write(sp+4+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,this)
 cpu.emu_start(address,stop,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('animation routine did not exit')
cases=[]
for readIndex in range(16):
 for count in [0,1,7,15]:
  body=bytearray(struct.pack('<7i',1,65000,25<<16,0,1,(readIndex+count)&15,readIndex))
  for i in range(16):body.extend(struct.pack('<5i',i*113,2+i,25<<16,i&1,3+i))
  cpu.mem_write(buffer,b'\x20\xff\xff\xff'+body);write(stream+0x10,0)
  invoke(0x4fd330,owner,[0x12345678,stream])
  steps=[]
  for action in ['restore','advance','advance','clear','advance']:
   if action=='advance':invoke(0x4fd3b0,owner,[0x51e])
   elif action=='clear':invoke(0x4fd2b0,owner)
   write(stream+0x10,0);write(stream+0xc,0);invoke(0x4fd370,owner,[stream])
   steps.append({'action':action,'bytes':list(cpu.mem_read(buffer+4,0x15c)),'position':read(stream+0x10)})
  cases.append({'bytes':list(body),'steps':steps})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'64 complete animation rings restored by004FD330, advanced by004FD3B0, cleared by004FD2B0 and serialized by004FD370. All16 read positions,0/1/7/15 queued entries; full348-byte body including stale slots compared each step. No algorithm/interface hooks.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} animation replay rings')
