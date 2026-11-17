"""Execute original004F53E0 rope length adjustment with captured interfaces."""
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
write(owner,vt);write(vt+0x100,attempt);write(owner+0xf8,buffer)
fields={'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'constrained':0xc8,'anchorX':0xcc,'anchorY':0xd0,'length':0xd4,'segmentCount':0xdc}
def hook(cpu,address,size,user):
 if address!=attempt:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4)
 calls.append(dict(operation='tryPosition',request=[signed(arg(0)),signed(arg(1))]))
 if accepted:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
 cpu.reg_write(UC_X86_REG_EAX,accepted)
 cpu.reg_write(UC_X86_REG_ESP,sp+12);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for count in [1,2,5,64]:
 for bent in [0,1]:
  for length in [-1,9<<16,10<<16,15<<16,16<<16,39<<16,40<<16,511<<16,512<<16,(count*8<<16)-1,(count*8<<16)-2,count*8<<16]:
   for constrained,accepted in [(0,1),(1,0),(1,1)]:
    segments=[(i*97-111 if i%2==0 else (0x3000 if i==1 else (i*37 if bent else 0))) for i in range(128)]
    body=dict(x=12345678,y=-8765432,vx=987654,vy=-765432,constrained=constrained,anchorX=100<<16,anchorY=200<<16,length=(count*8<<16)-1,segmentCount=count,segments=segments)
    for key,offset in fields.items():write(owner+offset,body[key])
    for i,value in enumerate(segments):write(buffer+i*4,value)
    sp=stack+0xff00;write(sp,stop);write(sp+4,length);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
    cpu.emu_start(0x4f53e0,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope length failed to return')
    out={key:signed(read(owner+offset)) for key,offset in fields.items()}
    out['segments']=[signed(read(buffer+i*4)) for i in range(128)]
    output=dict(body=out,calls=calls,result=signed(cpu.reg_read(UC_X86_REG_EAX)))
    cases.append(dict(body=body,length=length,accepted=accepted,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F53E0 with real trig, fixed divide and multiply. Position acceptance is supplied. All128 rope-buffer words compared, including unused words retained on shrink and newly zeroed pairs on extension. Constraint simulation and collision manager are not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope-length cases')
