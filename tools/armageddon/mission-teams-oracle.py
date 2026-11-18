"""Execute original mission CPU team construction."""
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
scratch=0x2300000;cpu.mem_map(scratch,0x10000)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(0x6e0000,0x20000))+bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def setstring(obj,value):
 dest=scratch+(obj&0xfff)*8+16
 write(dest-8,len(value));cpu.mem_write(dest,value+b'\0');write(obj,dest)
write(0x5174a4,stop+0x100);write(0x5178f4,stop+0x200)
write(0x517954,stop+0x300);write(0x517950,stop+0x400);write(0x5174a8,stop+0x500)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d48:setstring(cpu.reg_read(UC_X86_REG_ECX),b'');ret()
 elif address in [0x503d24,stop+0x300,stop+0x400]:ret()
 elif address==0x503dc0:
  setstring(read(sp+4),cstring(read(sp+8))%signed(read(sp+12)));ret()
 elif address==0x503d42:
  resource=read(sp+4);calls.append(['string',resource,snapshot()]);setstring(cpu.reg_read(UC_X86_REG_ECX),resourceStrings.get(resource,b'') if originalTables else resourceStrings.get(resource,b''));ret(1,4)
 elif address==stop+0x200:
  value=cstring(read(sp+12));cpu.mem_write(read(sp+4),value+b'\0');ret(len(value))
 elif address==0x41bc40:
  team=read(sp+4);receiver=cpu.reg_read(UC_X86_REG_ECX);calls.append(['flag',receiver,team,snapshot()])
  write(receiver+team*0xd7b+0x747,0x12345678);ret(0,4)
 elif address==stop+0x600:
  dest,source,count=read(sp+4),read(sp+8),read(sp+12);value=cstring(source)[:count];cpu.mem_write(dest,value+bytes(count-len(value)));ret(dest)
 elif address==stop+0x500:
  section,key=cstring(read(sp+4)).decode(),cstring(read(sp+8)).decode();fallback=cstring(read(sp+12));dest,size,filename=read(sp+16),read(sp+20),read(sp+24)
  calls.append(['profileString',section,key,fallback.hex(),dest,size,filename,snapshot()])
  value=strings.get(section.lower(),{}).get(key.lower(),fallback.decode('cp1252')).encode('cp1252')[:size-1]
  cpu.mem_write(dest,value+b'\0');ret(len(value),24)
 elif address==stop+0x100:
  section,key=cstring(read(sp+4)).decode(),cstring(read(sp+8)).decode();fallback=signed(read(sp+12));filename=read(sp+16)
  calls.append(['profile',section,key,fallback,filename,snapshot()])
  if mutation:write(owner+0x880,owner+0x1100 if filename==owner+0x1000 else owner+0x1000)
  values=profile.get(section.lower(),{})
  ret(values.get(key.lower(),fallback),16)
for address in [0x503d48,0x503d24,0x503dc0,0x503d42,0x41bc40,stop+0x100,stop+0x200,stop+0x300,stop+0x400,stop+0x500,stop+0x600]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
# Read English RT_STRING bytes directly from the input PE, independently of
# the generated browser catalog. Localized LoadString remains a host boundary.
def fileoffset(rva):
 for i in range(struct.unpack_from('<H',data,pe+6)[0]):
  virtual,start,rawsize,raw=struct.unpack_from('<IIII',data,headers+40*i+8)
  if start<=rva<start+max(virtual,rawsize):return raw+rva-start
 raise ValueError(hex(rva))
root=fileoffset(struct.unpack_from('<I',data,optional+112)[0]);resourceStrings={}
def walk(relative,path):
 at=root+relative;named,count=struct.unpack_from('<HH',data,at+12)
 for i in range(named+count):
  name,target=struct.unpack_from('<II',data,at+16+8*i)
  if target&0x80000000:walk(target&0x7fffffff,path+[name])
  elif len(path)==2 and path[0]==6 and name==1033:
   rva,length=struct.unpack_from('<II',data,root+target);pos=fileoffset(rva)
   for index in range(16):
    n=struct.unpack_from('<H',data,pos)[0];pos+=2
    resourceStrings[(path[1]-1)*16+index]=data[pos:pos+n*2].decode('utf-16-le').encode('cp1252');pos+=n*2
walk(0,[])
# Original country-to-speech routine runs; bounded CRT copy is the interface.
imports=base+struct.unpack_from('<I',data,optional+104)[0];p=imports
while read(p+12):
 lookup=base+(read(p) or read(p+16));iat=base+read(p+16);i=0
 while read(lookup+i*4):
  item=read(lookup+i*4)
  if not item&0x80000000 and cstring(base+item+2)==b'strncpy':write(iat+i*4,stop+0x600)
  i+=1
 p+=20
profiles=[]
for record in json.loads(Path('src/armageddon/mission-catalog.json').read_text())['records']:
 profile={};strings={}
 for section in record['sections']:
  values=profile.setdefault(section['name'].lower(),{});texts=strings.setdefault(section['name'].lower(),{})
  for key,value in section['entries']:
   texts.setdefault(key.lower(),value)
   try:values.setdefault(key.lower(),int(value,10))
   except ValueError:pass
 teams=profile.get('teams',{}).get('teamsinmission',1)
 profiles.append((record['source'],profile,strings,teams))
for count in [0,1,3,8,128,255]:
 profile={'humanteam':{'numberofworms':count},**{f'cputeam{i}':{'numberofworms':count,'teamskill':65535,'alliedgroup':-1,'missionvital':257} for i in range(1,6)}}
 profiles.append((f'count-{count}',profile,{},6))
cases=[];originalTables=True
for name,profile,strings,teams in profiles:
 for mutation in [0,1]:
  pattern=0xa5 if mutation else 0;country=[0,1,4,12,25,50,-1][len(cases)%7]
  cpu.mem_write(0x6e0000,bytes([pattern])*0x20000);cpu.mem_write(owner,bytes([pattern])*0x10000)
  sp=stack+0xe000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43d6c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  write(owner+0x880,owner+0x1000);write(0x6f47f4,country)
  calls=[];write(sp+0x28,teams);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBP,owner);cpu.reg_write(UC_X86_REG_ESI,teams);cpu.reg_write(UC_X86_REG_EBX,stop+0x100)
  cpu.emu_start(0x43eb22,0x43ed7a,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==0x43ed7a
  cases.append(dict(profile=name,values=profile,strings=strings,teams=teams,country=country,mutation=mutation,pattern=pattern,callCount=len(calls),callsSha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executableSha256=digest,entry='0043EB22..0043ED7A',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mission team-creation blocks')
