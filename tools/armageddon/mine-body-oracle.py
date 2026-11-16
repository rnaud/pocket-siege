"""Execute original mine physical initialization004E9512..004E96B4 after original base constructor."""
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

context=0x3000000;cpu.mem_map(context,0x20000)
manager=owner+0x1000;manager_table=owner+0x1100;probe=stop+0x100;register=stop+0x200
write(context+0x7d4,manager);write(manager,manager_table);write(manager_table+0xc,probe);write(manager_table+0x34,register)
for address,code in [(0x4ed970,b'\xc2\x04\x00'),(0x4b19e0,b'\xc2\x04\x00'),(register,b'\xc2\x04\x00'),(probe,b'\xc2\x0c\x00')]:cpu.mem_write(address,code)
hit=0;queries=[]
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
 if address==probe:
  sp=cpu.reg_read(UC_X86_REG_ESP);queries.append([signed(read(sp+8)),signed(read(sp+12)),read(owner+0x40)])
  cpu.reg_write(UC_X86_REG_EAX,hit)
cpu.hook_add(UC_HOOK_CODE,hook)
fields={'type':0x3c,'shape':0x44,'complex':0x4c,'mass':0x58,'enabled':0x48,'suspended':0x54,'sleeping':0xb8,'submerged':0xbc,'contact':0xc0,'moving':0xc4,'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'angle':0x98,'angularVelocity':0xa4,'radius':0x5c,'flags':0x40,'gravityScale':0x6c,'windScale':0x68,'drag':0x64,'skimScale':0xb4,'waterDrag':0x60,'restitutionX':0x78,'restitutionY':0x7c,'tangent':0x80}
cases=[]
for friction in [0,66,96]:
 for arm in [-1,0,4000]:
  for x,y in [[0,0],[123456,234567],[-65537,-196609],[2147483000,1200]]:
   for hit in [0,1]:
    cpu.mem_write(owner,b'\0'*0x400);write(owner+0x38,context);cpu.mem_write(context+0x11ba0,bytes([friction]))
    sp=stack+0xfe00;write(sp,stop)
    for i,v in enumerate([0,10,2]):write(sp+4+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4f4000,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Base constructor did not finish')
    before={key:signed(read(owner+off)) for key,off in fields.items()}
    write(owner,0x527300);payload=owner+0x2000;config=owner+0x2100
    for i,v in enumerate([0,0,x,y,32768,-49152,0,0,0,0,0]):write(payload+i*4,v&0xffffffff)
    for i,v in enumerate([48,arm,60,3000,50,100,50,0]):write(config+i*4,v&0xffffffff)
    write(sp+0x28,config);write(sp+0x34,1)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,payload)
    queries=[];cpu.emu_start(0x4e9512,0x4e96b4,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4e96b4:raise RuntimeError('Mine initialization did not finish')
    after={key:signed(read(owner+off)) for key,off in fields.items()}
    cases.append(dict(before=before,x=x,y=y,vx=32768,vy=-49152,arm=arm,friction=friction,hit=hit,queries=queries,after=after))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F4000 base numeric constructor and004E9512..004E96B4 mine initializer execute unchanged; task base/registration stubbed, placement hit supplied.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mine physical initialization cases')
