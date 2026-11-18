"""Execute native frontend team construction including speech filesystem fallback."""
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


cpu.mem_map(0,0x1000)
sprintf=stop+0x100;cpu.mem_write(sprintf,b'\xc3');write(0x5178f4,sprintf)
cpu.mem_write(0x4703a0,b'\xc3');cpu.mem_write(0x4190c0,b'\xc3')
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def hook(cpu,address,size,user):
 if address==0x4190c0:
  calls.append(['seed']);cpu.reg_write(UC_X86_REG_EAX,0xfedcba98)
 elif address==0x4703a0:
  calls.append(['handicap']);cpu.reg_write(UC_X86_REG_EAX,handicap)
 elif address==sprintf:
  sp=cpu.reg_read(UC_X86_REG_ESP);dest,fmt,arg=read(sp+4),cstring(read(sp+8)),read(sp+12)
  value=fmt%(arg if b'%c' in fmt else cstring(arg));cpu.mem_write(dest,value+b'\0')
  paths.append(value.hex()+'00');calls.append(['speech',b'%c' in fmt]);cpu.reg_write(UC_X86_REG_EAX,len(value))
for address in [sprintf,0x4703a0,0x4190c0]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
output=owner+0x20000;cpu.mem_map(output,0x10000)
# Observe only C-library/MFC interfaces; native fallback and country lookup run.
formatString=stop+0x300;directory=stop+0x400;copyString=stop+0x500
for address in [0x503d48,0x503d24,0x503dc0,directory,copyString]:cpu.mem_write(address,b'\xc3')
write(0x517900,directory)
# Resolve the EXE import slot by name rather than assuming its address.
imports=base+struct.unpack_from('<I',data,optional+104)[0]
p=imports
while read(p+12):
 lookup=base+(read(p) or read(p+16));iat=base+read(p+16);i=0
 while read(lookup+i*4):
  item=read(lookup+i*4)
  if not item&0x80000000 and cstring(base+item+2)==b'strncpy':write(iat+i*4,copyString)
  i+=1
 p+=20
def speechHook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d48:write(cpu.reg_read(UC_X86_REG_ECX),formatString)
 elif address==0x503dc0:
  obj,fmt,a,b=read(sp+4),cstring(read(sp+8)),cstring(read(sp+12)),cstring(read(sp+16))
  cpu.mem_write(formatString,fmt%(a,b)+b'\0');write(obj,formatString)
 elif address==directory:
  value=cstring(read(sp+4));calls.append(['directory',value.hex()]);cpu.reg_write(UC_X86_REG_EAX,int(not available and value!=b'C:\\WORMS'))
 elif address==copyString:
  dest,source,count=read(sp+4),read(sp+8),read(sp+12);value=cstring(source)[:count]
  cpu.mem_write(dest,value+bytes(count-len(value)));cpu.reg_write(UC_X86_REG_EAX,dest)
for address in [0x503d48,0x503dc0,directory,copyString]:cpu.hook_add(UC_HOOK_CODE,speechHook,begin=address,end=address)
cases=[]
for mask in [0,1,0x15,0x2a,0x3f]:
 for shared in [0,1]:
  for handicap,available in [(0,False),(1,False),(0,True),(1,True)]:
   for health in [0,100,255]:
    frontend=bytearray((i*13+7)&255 for i in range(0x7000));writes=[]
    def put(offset,size,value):
     frontend[offset:offset+size]=(value&((1<<(size*8))-1)).to_bytes(size,'little');writes.append([offset,size,value])
    put(0x1180,4,4);put(0x687e,1,shared);put(0x6880,1,bin(mask).count("1"))
    for player in range(13):put(0x11f8+player*0x78,1,int(player in [0,2,4]));put(0x11fb+player*0x78,1,player-6)
    for player in range(-2,13):put(0x11f4+player*0x78,4,[0,2,4,25,44,50][(player+2)%6])
    for team in range(6):
     offset=0x179c+team*0xd7b
     for delta,value in [(0,[-1,0,2,4,-2,0][team]),(1,team%2 if shared else team),(0x124,(mask>>team)&1),
       (0x126,team-2),(0x96,team%2),(0x98,team%8+1),(0x99,[-128,-4,-1,0,1,127][team]),(0x9a,team%2)]:put(offset+delta,1,value)
     put(offset+0x14+64,1,0)
     put(offset+3+16,1,0)
     for worm in range(8):put(offset+0x9b+worm*17+16,1,0)
    cpu.mem_write(0x6e0000,bytes(frontend));cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
    scheme=bytearray(216);scheme[0x15]=health;scheme[6]=193;cpu.mem_write(0x6f4560,bytes(scheme))
    cpu.mem_write(0x6f48bc,b'C:\\WORMS\0');cpu.mem_write(0x6e1178,b'D');cpu.mem_write(0x6f4839,b'English'+bytes(58))
    sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    paths=[];calls=[];cpu.emu_start(0x419150,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    for entry in ([0x419840,0x4198d0] if mask else [0x4198d0]):
     sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cpu.mem_write(output,bytes(0x2c14));sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0x3c)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,output)
    cpu.emu_start(0x4c2640,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(directory_available=available,speech_fallback=True,inventory_sha256=hashlib.sha256(cpu.mem_read(output,0x2c14)).hexdigest(),writes=writes,scheme=list(scheme),handicap=handicap,paths=paths,calls=calls,sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
countries=[]
for country in list(range(-2,54))+[0x7fffffff,-2147483648]:
 cpu.mem_write(owner,bytes([165])*80);sp=stack+0xf000;write(sp,stop);write(sp+4,country);write(sp+8,owner+4)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x44c030,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 countries.append(dict(country=country,result=signed(cpu.reg_read(UC_X86_REG_EAX)),bytes=bytes(cpu.mem_read(owner,80)).hex()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,countries=countries,entry='00419150 /0044C030',method='Original player/team/worm construction and bank/count getters execute. Handicap enablement and speech-path formatting are interfaces. Original speech fallback and country selection execute; CString formatting, bounded string copy and directory probing are interfaces. Full setup bytes and boundary calls compared, native initial/next-round starting-order selection follows, then original004C2640 imports the records and all inventory output bytes are captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} team setups')
