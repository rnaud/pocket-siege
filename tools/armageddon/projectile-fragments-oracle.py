"""Execute original004E2CA0 secondary projectile emission."""
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

context,vtable,getvelocity=owner+0x4000,owner+0x5000,owner+0x6000
write(owner+0x38,context);write(owner,vtable);write(vtable+0x60,getvelocity)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address not in [0x4ccf50,0x492550,0x4e1830,getvelocity]:return
 sp=cpu.reg_read(UC_X86_REG_ESP);cleanup=0
 if address==0x4ccf50:cleanup=8;cpu.reg_write(UC_X86_REG_EAX,owner+0x7000)
 elif address==0x492550:cpu.reg_write(UC_X86_REG_EAX,owner+0x8000)
 elif address==getvelocity:
  cleanup=8;write(read(sp+4),body['vx']&0xffffffff);write(read(sp+8),body['vy']&0xffffffff)
 else:
  cleanup=12;pointer=read(sp+12);outputs.append([signed(read(pointer+i*4)) for i in range(11)])
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for count in [0,1,5]:
 for direction in [-1,0,90,270]:
  for mode in [0,2,3,4]:
   for variant in range(6):
    body=dict(count=count,speed=[25,100,200][variant%3],variance=[0,25,100][variant%3],direction=direction,spread=[0,90,180][variant%3],mode=mode,impactVx=[0,-65536,65536][variant%3],impactVy=[-131072,0,131072][variant%3],vx=0 if variant%2 else 12345,vy=-98765,facing=-1 if variant%2 else 1)
    payload=[99,2,123,456,789,-321,222,333,0,55,3000]
    for i,value in enumerate(payload):write(owner+0x130+i*4,value&0xffffffff)
    for key,off in [('count',0x218),('speed',0x21c),('variance',0x220),('direction',0x224),('spread',0x228),('mode',0x288),('impactVx',0x39c),('impactVy',0x3a0),('facing',0x3c8)]:write(owner+off,body[key]&0xffffffff)
    seed=42+variant;frame=variant*17;write(context+0x1acc,seed);write(context+0x7f0,frame)
    sp=stack+0xff00;write(sp,stop);write(sp+4,0x1000000);write(sp+8,0x2000000)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    outputs=[];cpu.emu_start(0x4e2ca0,stop,count=100000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Fragment emission did not finish')
    cases.append(dict(body=body,payload=payload,x=0x1000000,y=0x2000000,seed=seed,frame=frame,outputs=outputs,randomState=read(context+0x1acc)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E2CA0 including original RNG, trig and fixed multiply. Context lookup, velocity getter, allocation and child constructor interfaces supplied/captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} fragment emission cases')
