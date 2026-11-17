"""Execute original004D4010 flame damage selection and payload."""
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

context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
manager=owner+0x1000;mv=owner+0x2000;tv=owner+0x3000
write(context+0x7d4,manager);write(manager,mv)
for off,target in [(0x48,stop+0x100),(0x4c,stop+0x200)]:write(mv+off,target)
for off,target in [(0x50,stop+0x300),(0x5c,stop+0x400),(8,stop+0x500)]:write(tv+off,target)
fields={'x':0x4c,'y':0x50,'vx':0x54,'vy':0x58,'enabled':0x78,'strength':0x40,'decay':0x48,'hitDelay':0x6c,'damage':0x9c,'persistent':0xac}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def words(address,count):return [signed(read(address+i*4)) for i in range(count)]
def hook(cpu,address,size,user):
 global cursor,visualIndex
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address in [stop+0x100,stop+0x200]:
  cursor=0 if address==stop+0x100 else cursor+1
  if cursor<len(candidates):write(read(sp+4),owner+0x4000+cursor*0x100);ret(1,8)
  else:ret(0,8)
 elif address==stop+0x300:ret(candidates[cursor]['type'],0)
 elif address==stop+0x400:
  write(read(sp+4),candidates[cursor]['x']);write(read(sp+8),candidates[cursor]['y']);ret(0,8)
 elif address==stop+0x500:events.append(['hit',cursor]+words(sp+8,2)+[words(read(sp+16),6)]);ret(0,16)
 elif address==0x4ee960:events.append(['logic']);ret(255,0)
 elif address==0x4ee930:events.append(['visual']);ret([0,65535,123456][visualIndex],0);visualIndex+=1
 elif address==0x4ee190:events.append(['smoke',words(read(sp+4),7)]);ret(0,4)
 elif address==0x4eebe0:events.append(['busy']);ret(0,0)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for strength in [0,65535,2147483647]:
 radius=signed((strength*15+0x50000)&0xffffffff)
 for offset in [0,65536,radius-1,radius,-radius,-2147483648]:
  for type in [1,2,3,4,5,6,17,34]:
   for enabled,persistent in [(0,0),(1,0),(1,1)]:
    body={'x':0,'y':0,'vx':-12345,'vy':98765,'enabled':enabled,'strength':strength,'decay':500,'hitDelay':0,'damage':4,'persistent':persistent}
    candidates=[{'type':1,'x':0,'y':0},{'type':type,'x':offset,'y':65536},{'type':2,'x':2*65536,'y':0}]
    for i,c in enumerate(candidates):write(owner+0x4000+i*0x100,tv)
    for key,off in fields.items():write(owner+off,body[key])
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];cursor=0;visualIndex=0;cpu.emu_start(0x4d4010,stop,count=30000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame hit did not return')
    cases.append({'input':body,'candidates':candidates,'events':events,'output':{key:signed(read(owner+off)) for key,off in fields.items()}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D4010','method':'Original ordered target selection, native0049BF50 normalization, hit packet, cooldown, smoke and persistent strength reduction. Registry enumeration, candidate getters/event receiver, logic/visual RNG and smoke/busy sinks supplied.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame damage cases')
