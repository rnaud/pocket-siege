"""Execute original post-turn poison settlement stage."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
fields={'selectedTeam':(owner,0x130),'selectedWorm':(owner,0x134),'poisonPending':(owner,0x15c),'mode':(context,0x814)}
write(owner,owner+0x1000);write(owner+0x1008,stop+0x100)
calls=[]
def hook(cpu,address,size,user):
 if address in [0x4b72d6,0x4b72e1]:cpu.emu_stop();return
 if address in [0x4ecfb0,stop+0x100]:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  calls.append({'event':read(sp+8),'size':read(sp+12)})
  target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+20);cpu.reg_write(UC_X86_REG_EIP,target)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for pending in [-2147483648,-1,0,1,2,2147483647]:
 for selected in [0,1,6]:
  body={'selectedTeam':selected,'selectedWorm':selected+1,'poisonPending':pending,'mode':7}
  for k,(address,offset) in fields.items():write(address+offset,body[k])
  calls.clear();cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
  cpu.emu_start(0x4b7279,stop,count=1000)
  end=cpu.reg_read(UC_X86_REG_EIP)
  if end not in [0x4b72d6,0x4b72e1]:raise RuntimeError('Stage did not exit')
  after={k:signed(read(address+offset)) for k,(address,offset) in fields.items()}
  cases.append({'input':body,'result':{'body':after,'calls':list(calls),'ready':end==0x4b72e1}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B7279..004B72E1','method':'Unmodified post-turn branch; event400 dispatcher and event426 virtual broadcast captured. Event400 payload is uninitialized and unused by its receiver, so only event and size are compared.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} post-turn poison decisions')
