"""Execute original004FCD58 Baseball Bat area-request branch."""
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

record,payload=owner+0x2000,owner+0x3000
write(owner+0x354,record)
def signed(v):return v if v<0x80000000 else v-0x100000000
requests=[]
def hook(cpu,address,size,user):
 if address!=0x4f7da0:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 requests.append([signed(read(sp+4+i*4)) for i in range(12)])
 cpu.reg_write(UC_X86_REG_ESP,sp+52);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x4f7da0,end=0x4f7da0)
cases=[]
for facing in [-1,1]:
 for damage,push in [(30,125),(0,0),(50,100),(-10,-30),(1,5000)]:
  for vx,vy in [(65536,0),(-65536,0),(46340,-46340),(0,-65536),(0,65536),(12345,-98765)]:
   for x,y in [(1234567,-7654321),(0x7fffffff,-0x70000000)]:
    config={'0x70':damage,'0x74':push}
    for key,value in config.items():write(record+int(key,16),value&0xffffffff)
    write(owner+0x1b0,facing&0xffffffff)
    for off,value in [(8,x),(12,y),(16,vx),(20,vy)]:write(payload+off,value&0xffffffff)
    sp=stack+0xfe00;write(sp+0x13c,payload)
    cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);requests=[]
    cpu.emu_start(0x4fcd58,0x4fcdc6,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4fcdc6:raise RuntimeError('Bat branch did not finish')
    cases.append(dict(record=config,x=x,y=y,vx=vx,vy=vy,facing=facing,request=requests[0]))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004FCD58..004FCDC6; area dispatcher captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Bat requests')
