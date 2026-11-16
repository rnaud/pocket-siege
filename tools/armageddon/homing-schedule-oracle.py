"""Execute original004E3D80 homing activation and duration schedule."""
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
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]

fields=dict(delay=0x354,duration=0x358,kind=0x350,owner=0x130,initialized=0x100)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in [0x4e30f0,0x4e3270,0x4b26a0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);cleanup=0
 if address==0x4b26a0:
  args=[read(sp+4+i*4) for i in range(6)]
  calls.append(dict(operation='event',request=args[1:5]+[read(args[5])]))
  cleanup=24
 else:calls.append(dict(operation='steer' if address==0x4e30f0 else 'avoid'))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for delay in [-1,0,1,19,20,21,500]:
 for duration in [-1,0,1,20,21,3500]:
  for kind in [0,1,2,3]:
   for source in [0,7]:
    body=dict(delay=delay,duration=duration,kind=kind,owner=source,initialized=1)
    for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
    write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    calls=[];cpu.emu_start(0x4e3d80,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Schedule did not return')
    cases.append(dict(body=body,output={name:signed(read(owner+offset)) for name,offset in fields.items()},calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E3D80; steering, obstacle avoidance and owner event delivery captured as interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} homing schedule cases')
