"""Execute original004F51A0 rope constraint initialization with captured interfaces."""
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

vt,attempt,buffer=owner+0x1000,owner+0x2000,owner+0x3000
write(owner,vt);write(vt+0x100,attempt)
fields={'x':0x90,'y':0x94,'angle':0x98,'constrained':0xc8,'anchorX':0xcc,'anchorY':0xd0,'length':0xd4,'segmentCount':0xdc}
def hook(cpu,address,size,user):
 global cursor,allocated
 if address not in [attempt,0x4924d0]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4)
 if address==attempt:
  calls.append(dict(operation='tryPosition',request=[signed(arg(0)),signed(arg(1))]));count=2
  accepted=pattern[cursor%len(pattern)];cursor+=1
  if accepted:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
  cpu.reg_write(UC_X86_REG_EAX,accepted)
 else:
  calls.append(dict(operation='allocate',bytes=arg(1)));count=0;allocated=True
  cpu.mem_write(buffer,bytes([0xa5])*512);cpu.reg_write(UC_X86_REG_EAX,buffer)
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for dx,dy in [(0,0),(9<<16,0),(10<<16,0),(10<<16,1),(11<<16,-1),(20<<16,30<<16),(-20<<16,30<<16),(-20<<16,-30<<16),(20<<16,-30<<16),(511<<16,0),(512<<16,0),(513<<16,0),(2147483647,1),(-2147483648,0)]:
 for anchorX,anchorY in [(0,0),(12345678,-8765432),(2147483647,-2147483648)]:
  for constrained in [0,1]:
   for pattern in [[1],[0,1],[0]]:
    body=dict(x=signed((anchorX+dx)&0xffffffff),y=signed((anchorY+dy)&0xffffffff),angle=93,constrained=constrained,anchorX=71,anchorY=72,length=73,segmentCount=74,segments=[])
    for key,offset in fields.items():write(owner+offset,body[key])
    sp=stack+0xff00;write(sp,stop);write(sp+4,anchorX);write(sp+8,anchorY);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];cursor=0;allocated=False
    cpu.emu_start(0x4f51a0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope constraint failed to return')
    out={key:signed(read(owner+offset)) for key,offset in fields.items()}
    out['segments']=[signed(read(buffer+i*4)) for i in range(out['segmentCount']*2)] if allocated else []
    output=dict(body=out,calls=calls,result=signed(cpu.reg_read(UC_X86_REG_EAX)))
    cases.append(dict(body=body,anchor=[anchorX,anchorY],pattern=pattern,attempts=cursor,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F51A0 with real angle, normalization, length, trig and fixed multiply. Collision-aware position acceptance supplied; allocator returns a mapped512-byte buffer. Compares initialized segment words, partial failure writes and call ordering. Pointer identity and downstream constraint simulation are not asserted.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope-constraint cases')
