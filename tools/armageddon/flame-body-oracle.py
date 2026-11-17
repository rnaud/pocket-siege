"""Execute original004D3C50 flame actor constructor."""
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

context=0x3000000;cpu.mem_map(context,0x20000)
fields={'age':0x3c,'strength':0x40,'progress':0x44,'decay':0x48,'x':0x4c,'y':0x50,'vx':0x54,'vy':0x58,'smokeProgress':0x5c,'jitterX':0x60,'jitterY':0x64,'burnProgress':0x68,'hitDelay':0x6c,'initial':0x70,'contact':0x74,'enabled':0x78,'created':0x7c,'identity':0xb0,'reserved':0xb4}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def hook(cpu,address,size,user):
 global randomIndex
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ed970:write(owner+0x38,context);events.append(['base',read(sp+4)]);ret(owner,4)
 elif address==0x4b19e0:events.append(['register',read(sp+4)]);ret(0,4)
 elif address==0x4ee960:
  events.append(['random']);ret(randoms[randomIndex],0);randomIndex+=1
 elif address==0x4d3e90:events.append(['pool']);ret(0,0)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for vx,vy in [(-524288,-524288),(524288,-524288),(-524288,524288),(524288,524288)]:
 for lifetime in [1,1000,3000]:
  for randoms in [[0,0],[65535,65535],[0xffffffff,0x80000000],[123456,987654]]:
   for counter in [0,255,256]:
    record=[123456,-765432,vx,vy,0,4,1,lifetime,100,5,0]
    cpu.mem_write(owner,bytes(0xb8));write(context+0x7f0,765);write(context+0x12430,counter)
    payload=owner+0x2000
    for i,v in enumerate(record):write(payload+i*4,v)
    sp=stack+0xf000;write(sp,stop);write(sp+4,23);write(sp+8,payload)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];randomIndex=0;cpu.emu_start(0x4d3c50,stop,count=20000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame constructor did not return')
    cases.append({'record':record,'randoms':randoms,'counter':counter,'frame':765,'events':events,'output':{key:signed(read(owner+off)) for key,off in fields.items()},'copied':[signed(read(owner+0x84+i*4)) for i in range(11)],'nextCounter':read(context+0x12430)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D3C50','method':'Original flame constructor numeric fields and11-word record copy. Base task constructor, task registration, logic RNG and flame pool registration are supplied/captured interfaces.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame constructor cases')
