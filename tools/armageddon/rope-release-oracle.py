"""Execute original rope release event branch."""
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


vt,context,transition=owner+0x1000,owner+0x20000,owner+0x2000
cpu.mem_map(context,0x20000);write(owner+0x38,context);write(vt+0x80,transition)
def hook(cpu,address,size,user):
 if address!=transition:return
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp+4);calls.append(['state',target]);write(owner+0x158,target)
 # Deliberately overwrite angle at state entry to verify use of saved angle.
 write(owner+0x98,12345)
 cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for angle in [-2147483648,-65537,-32768,-1,0,1,0x1999,0x199a,0x4000,0x8000,0xe666,0xe667,65535,65536,2147483647]:
 for scheme in [0,1,100,255]:
  body=dict(state=0x7b,field15c=999,ropeAngle=123,angle=angle)
  write(owner+0x158,body['state']);write(owner+0x15c,999);write(owner+0x278,123);write(owner+0x98,angle)
  cpu.mem_write(context+0x11d40,bytes([scheme]))
  sp=stack+0xf000;write(sp+0x48,angle);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,vt);calls=[]
  cpu.emu_start(0x4da552,0x4db56f,count=1000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4db56f:raise RuntimeError('Release branch failed')
  out=dict(state=signed(read(owner+0x158)),field15c=read(owner+0x15c),ropeAngle=read(owner+0x278),angle=signed(read(owner+0x98)))
  cases.append(dict(body=body,schemeByte=scheme,output=dict(body=out,calls=calls)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004DA552..004DA59F event40C state7B branch, real native clamp. Entry registers and saved-angle stack slot supplied. State callback changes angle to test saved-angle ordering; full dispatch and state teardown are not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} release cases')
