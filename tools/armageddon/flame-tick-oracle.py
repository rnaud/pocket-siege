"""Execute original004D4590 flame lifecycle event3EA."""
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
vt=owner+0x1000;terrain=owner+0x2000;tv=owner+0x3000;write(owner,vt);write(vt,stop+0x100);write(context+0x24,terrain);write(terrain,tv);write(tv+0xc,stop+0x200)
fields={'age':0x3c,'strength':0x40,'progress':0x44,'decay':0x48,'x':0x4c,'y':0x50,'vx':0x54,'vy':0x58,'smokeProgress':0x5c,'jitterX':0x60,'jitterY':0x64,'burnProgress':0x68,'hitDelay':0x6c,'initial':0x70,'contact':0x74,'enabled':0x78}
def ret(value,cleanup):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target)
def words(address,count):return [signed(read(address+4*i)) for i in range(count)]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4eebe0:events.append(['busy']);ret(0,0)
 elif address==0x4d42d0:events.append(['motion']);ret(moving,0)
 elif address==0x4d4010:events.append(['hit']);ret(0,0)
 elif address==0x4d3f30:
  payload=read(sp+4);events.append(['spread',words(payload,11)]);write(payload,read(payload)+65536);ret(0,4)
 elif address==0x4ee930:events.append(['visual']);ret(123456,0)
 elif address==0x4ee960:events.append(['logic']);ret(54321,0)
 elif address==0x4ee190:events.append(['smoke',words(read(sp+4),7)]);ret(0,4)
 elif address==0x4ee990:events.append(['camera']+words(sp+4,3));ret(0,12)
 elif address==0x4edc90:events.append(['sound']+words(sp+4,5));ret(0,20)
 elif address==stop+0x100:events.append(['delete',read(sp+4)]);ret(0,4)
 elif address==stop+0x200:events.append(['burn']+words(sp+4,3));ret(0,12)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for strength in [0,0x1998,0x1999,0x8000,65535]:
 for persistent in [0,1]:
  for moving in [0,1]:
   for profile in range(4):
    for hitDelay in [0,20,21]:
     for water in [0,100]:
      record=[123456,345678,12345,-23456,profile%2,4,1,3000,100,0 if profile==3 else 5,persistent]
      body={'age':80 if profile<2 else -1,'strength':strength,'progress':65000,'decay':500,'x':123456,'y':345678,'vx':524288 if profile==0 else 12345,'vy':-524288 if profile==0 else -23456,'smokeProgress':65535 if profile%2 else 0,'jitterX':0,'jitterY':0,'burnProgress':65535,'hitDelay':hitDelay,'initial':1,'contact':profile%2,'enabled':0 if profile==2 else 1}
      for key,off in fields.items():write(owner+off,body[key])
      for i,v in enumerate(record):write(owner+0x84+i*4,v)
      frame=11 if profile%2 else 12;write(context+0x7f0,frame);write(context+0x804,water)
      sp=stack+0xf000;write(sp,stop)
      for i,v in enumerate([0,0x3ea,0,0]):write(sp+4+i*4,v)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);events=[];cpu.emu_start(0x4d4590,stop,count=100000)
      if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Flame tick did not return')
      cases.append({'input':body,'record':record,'moving':moving,'frame':frame,'water':water,'events':events,'output':{key:signed(read(owner+off)) for key,off in fields.items()},'outputRecord':words(owner+0x84,11)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004D4590 event3EA','method':'Original full lifecycle; movement and hit calls captured with no mutation, spread interface mutates child X by1px to verify reuse across left/right requests. Logic/visual RNG, smoke, camera, terrain burns, sounds, busy and deletion captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} flame lifecycle cases')
