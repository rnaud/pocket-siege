"""Execute original004EA4C5..004EA584 mine camera requests and ordering."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

from unicorn.x86_const import UC_X86_REG_EDI
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context);write(owner,0x527300)
def signed(v):return v if v<0x80000000 else v-0x100000000
requests=[]
def hook(cpu,address,size,user):
 if address!=0x4ee990:return
 sp=cpu.reg_read(UC_X86_REG_ESP);requests.append([signed(read(sp+4+i*4)) for i in range(3)])
 cpu.reg_write(UC_X86_REG_ESP,sp+16);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for vx,vy,submerged,contact,moving in [(0,0,0,0,0),(1,0,0,0,0),(0,-1,0,0,0),(0,0,1,0,0),(0,0,0,1,0),(0,0,0,0,1)]:
 for triggered in [0,1]:
  for arm in [-1,0,20]:
   for index in [0,1,2]:
    body=dict(vx=vx,vy=vy,submerged=submerged,contact=contact,moving=moving,x=-12345,y=543210)
    for off,val in [(0x9c,vx),(0xa0,vy),(0xbc,submerged),(0xc0,contact),(0xc4,moving),(0x128,triggered),(0x11c,arm),(0x110,index)]:write(owner+off,val&0xffffffff)
    orders=[2,0,1];write(context+0x102c,3);write(context+0x800,0)
    for i,v in enumerate(orders):write(context+0x1030+i*4,v);write(context+0xc2c+i*4,i)
    requests=[];sp=stack+0xfe00;write(sp+0x1c,body['x']&0xffffffff);write(sp+0x18,body['y'])
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,0x527300)
    cpu.emu_start(0x4ea4c5,0x4ea584,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4ea584:raise RuntimeError('Camera branch did not finish')
    cases.append(dict(body=body,timer=dict(triggered=triggered,arm=arm),orders=orders,index=index,after=[read(context+0x1030+i*4) for i in range(3)],requests=requests,activity=read(context+0x800)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004EA4C5..004EA584 executes real awake/submerged getters, mine ordering and004EEBE0 activity update; camera offer004EE990 captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine camera cases')
