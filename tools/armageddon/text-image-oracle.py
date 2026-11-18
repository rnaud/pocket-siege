"""Execute original cached text-image renderer004C67A0."""
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

primary=owner+0x2000;secondary=owner+0x3000;vt=owner+0x4000;font=owner+0x5000;fontvt=owner+0x6000;text=owner+0x7000;out=owner+0x8000
write(primary,vt);write(secondary,vt);write(font,fontvt);write(owner+0x14,font)
interfaces={}
for i,(offset,argc,name) in enumerate([(0x3c,5,'fill'),(0x50,0,'clear'),(0x34,4,'horizontal'),(0x38,4,'vertical'),(0x58,3,'pixel'),(0x4c,8,'copy')]):
 address=stop+0x100+i*0x100;write(vt+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4));interfaces[address]=(name,argc)
write(0x5249b0+0x4c,stop+0x600)
write(fontvt+0x24,stop+0x800);cpu.mem_write(stop+0x800,b'\xc2\x1c\x00')
for addr,argc in [(0x492bc0,3)]:cpu.mem_write(addr,b'\xc2'+struct.pack('<H',argc*4))
for addr in [0x492550,0x492690]:cpu.mem_write(addr,b'\xc3')
fields={'width':4,'height':8,'baseImage':12,'fadedImage':16,'seed':24,'font':0x11c,'cachedWidth':0x120,'cachedHeight':0x124,'background':0x128,'border':0x12c,'coverage':0x130,'image':0x134}
def string(address):
 out=[]
 while cpu.mem_read(address,1)[0]:out.append(cpu.mem_read(address,1)[0]);address+=1
 return bytes(out).decode()
def state():
 result={k:signed(read(owner+o)) for k,o in fields.items()};result['text']=string(owner+0x1c);return result
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);this=cpu.reg_read(UC_X86_REG_ECX)
 def arg(i):return signed(read(sp+4*i))
 if address in interfaces:
  name,argc=interfaces[address];calls.append([name,this]+[arg(i) for i in range(1,argc+1)])
 elif address==stop+0x800:
  calls.append(['text',arg(1),arg(2),arg(3),arg(4),string(read(sp+20))]);write(read(sp+24),measurement[0]);write(read(sp+28),measurement[1])
 elif address==0x492550:calls.append(['allocate',arg(1)]);cpu.reg_write(UC_X86_REG_EAX,secondary)
 elif address==0x492bc0:calls.append(['initialize',this,arg(1),arg(2),arg(3)]);cpu.reg_write(UC_X86_REG_EAX,this)
 elif address==0x492690:calls.append(['mask']+[arg(i) for i in range(1,7)])
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for capacity in [(128,32),(8,4),(0,0)]:
 for measurement in [(0,0),(17,12),(200,48)]:
  for background,border in [(0,0),(7,0),(0,9),(8,7)]:
   for faded in [0,secondary]:
    initial=dict(width=capacity[0],height=capacity[1],baseImage=primary,fadedImage=faded,seed=-123,font=-1,cachedWidth=0,cachedHeight=0,background=-1,border=-1,coverage=-1,image=0,text='')
    for key,off in fields.items():write(owner+off,initial[key])
    cpu.mem_write(owner+0x1c,b'\0')
    sequence=[]
    for value,coverage,identity in [('Crate',65536,15),('Crate',65536,15),('Crate',32768,15),('New',32768,15),('New',0,15),('New',0,16),('New',-1,16),('New',65536,16)]:
     request=dict(text=value,font=identity,background=background,border=border,coverage=coverage)
     cpu.mem_write(text,value.encode()+b'\0');sp=stack+0xf000;write(sp,stop)
     for i,v in enumerate([text,identity,background,border,out,out+4,coverage]):write(sp+4+i*4,v)
     calls=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4c67a0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     sequence.append(dict(request=request,calls=calls,result=dict(image=cpu.reg_read(UC_X86_REG_EAX),width=signed(read(out)),height=signed(read(out+4))),state=state()))
    cases.append(dict(initial=initial,measurement=measurement,sequence=sequence))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004C67A0',method='Original cache checks, draw orchestration, bounds, fade selection, RNG and cache updates execute unchanged. Font measurements, primitive image drawing, allocation/construction and masking are observed interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} text image sequences / {sum(len(c["sequence"]) for c in cases)} calls')
