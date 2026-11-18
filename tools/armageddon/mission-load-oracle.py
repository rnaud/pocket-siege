"""Execute original complete mission loader composition."""
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
parser.add_argument('--native-services',action='store_true')
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
 global rng
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d48:setstring(cpu.reg_read(UC_X86_REG_ECX),b'');ret()
 elif address in [0x503d24,stop+0x300,stop+0x400]:ret()
 elif address==0x503dc0:
  fmt=cstring(read(sp+8));value=fmt%(cstring(read(sp+12)),signed(read(sp+16))) if fmt==b'%s %d' else fmt%signed(read(sp+12))
  setstring(read(sp+4),value);ret()
 elif address==0x503d2a:
  dest=cpu.reg_read(UC_X86_REG_ECX);setstring(dest,cstring(read(sp+4)));ret(dest,4)
 elif address==0x503d1e:
  dest=cpu.reg_read(UC_X86_REG_ECX);write(dest,read(read(sp+4)));ret(dest,4)
 elif address==0x503ec2:
  calls.append(['message',cstring(read(sp+4)).decode('cp1252'),read(sp+8),read(sp+12),snapshot()]);ret(0,12)
 elif address==0x470a20:
  calls.append(['scheme',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8),snapshot()])
  if not failure:write(0x6f4560,0x12345678)
  ret(-1 if failure else 0,8)
 elif address in [0x415540,0x4197d0,0x419610]:
  receiver=cpu.reg_read(UC_X86_REG_ECX)
  if address==0x415540:
   calls.append(['initialize',receiver,snapshot()]);cpu.mem_write(0x6e69c6,bytes([max(1,min(6,teams))]));ret()
  elif address==0x4197d0:
   calls.append(['mode',receiver,read(sp+4),snapshot()]);cpu.mem_write(0x6f3cdc,b'W');ret(0,4)
  else:calls.append(['finalize',receiver,snapshot()]);write(0x6f4500,0x12345678);ret()
 elif address==0x419740:
  calls.append(['music',signed(read(sp+4)),snapshot()]);write(0x6f3e97,0x12345678);ret(0,4)
 elif address==0x41b730:
  calls.append(['teams',snapshot()]);ret(cpu.mem_read(0x6e69c6,1)[0])
 elif address==0x503d42:
  resource=read(sp+4);calls.append(['string',resource,snapshot()]);setstring(cpu.reg_read(UC_X86_REG_ECX),resourceStrings.get(resource,b'') if originalTables else resourceStrings.get(resource,b''));ret(1,4)
 elif address==stop+0x200:
  fmt=cstring(read(sp+8));value=fmt%(read(sp+12)&255) if b'%c' in fmt else fmt%cstring(read(sp+12));cpu.mem_write(read(sp+4),value+b'\0');ret(len(value))
 elif address==stop+0x700:
  calls.append(['random',snapshot()]);rng=(rng*214013+2531011)&0xffffffff;ret((rng>>16)&32767)
 elif address==0x41bc40:
  team=read(sp+4);receiver=cpu.reg_read(UC_X86_REG_ECX);calls.append(['flag',receiver,team,snapshot()])
  write(receiver+team*0xd7b+0x747,0x12345678);ret(0,4)
 elif address==stop+0x600:
  dest,source,count=read(sp+4),read(sp+8),read(sp+12);value=cstring(source)[:count];cpu.mem_write(dest,value+bytes(count-len(value)));ret(dest)
 elif address==stop+0x500:
  section,key=cstring(read(sp+4)).decode(),cstring(read(sp+8)).decode();fallback=cstring(read(sp+12));dest,size,filename=read(sp+16),read(sp+20),read(sp+24)
  calls.append(['land',section,key,fallback.decode(),size,filename,snapshot()] if section=='Enviroment' and key=='LandFile' else ['profileString',section,key,fallback.hex(),dest,size,filename,snapshot()])
  value=strings.get(section.lower(),{}).get(key.lower(),fallback.decode('cp1252')).encode('cp1252')[:size-1]
  cpu.mem_write(dest,value+b'\0');ret(len(value),24)
 elif address==stop+0x100:
  section,key=cstring(read(sp+4)).decode(),cstring(read(sp+8)).decode();fallback=signed(read(sp+12));filename=read(sp+16)
  calls.append(['profile',section,key,fallback,filename,snapshot()])
  if mutation:write(owner+0x880,owner+0x1100 if filename==owner+0x1000 else owner+0x1000)
  values=profile.get(section.lower(),{})
  ret(values.get(key.lower(),fallback),16)
for address in [0x503d48,0x503d24,0x503dc0,0x503d42,0x503d2a,0x503d1e,0x503ec2,0x470a20,0x415540,0x4197d0,0x419610,0x419740,0x41b730,0x41bc40,stop+0x100,stop+0x200,stop+0x300,stop+0x400,stop+0x500,stop+0x600,stop+0x700]:
 if args.native_services and address in [0x4197d0,0x419610,0x419740,0x41b730]:continue
 cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
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
  if not item&0x80000000 and cstring(base+item+2)==b'rand':write(iat+i*4,stop+0x700)
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
 profiles.append((record['source'],profile,strings,False,False))
for variant in ['unselected','missing-number','few-teams','few-teams-two','many-teams','scheme-failure','missing-land','empty-land','one-team-objectives']:
 profile={'mission':{'missionnumber':1},'teams':{'teamsinmission':2},'event0001':{'eventend':1},'sequence0001':{'eventend':1}}
 strings={'enviroment':{'landfile':'fixture.img'}}
 if variant=='missing-number':profile['mission']={}
 if variant in ['few-teams','few-teams-two','one-team-objectives']:
  profile['teams']['teamsinmission']=1;profile['mission']['winningcondition']={'few-teams':0,'few-teams-two':2,'one-team-objectives':1}[variant]
 if variant=='many-teams':profile['teams']['teamsinmission']=7
 if variant=='missing-land':strings={}
 if variant=='empty-land':strings['enviroment']['landfile']=''
 profiles.append((variant,profile,strings,variant=='scheme-failure',variant=='unselected'))
cases=[];originalTables=True
for name,profile,strings,failure,unselected in profiles:
 for mutation in [0,1]:
  teams=profile.get('teams',{}).get('teamsinmission',1);pattern=0xa5 if mutation else 0;country=4 if mutation else 1
  cpu.mem_write(0x6e0000,bytes([pattern])*0x20000);cpu.mem_write(owner,bytes([pattern])*0x10000)
  sp=stack+0xe000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43d6c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  write(owner+0x880,owner+0x1000);write(0x6f47f4,country);cpu.mem_write(0x6e6880,b'\1')
  if not unselected:write(owner+0x884,1);write(owner+0x54,1 if mutation else -1)
  if args.native_services:cpu.mem_write(0x6e1178,bytes([67+mutation]))
  rng=123+pattern
  calls=[];write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43e910,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(profile=name,nativeServices=args.native_services,values=profile,strings=strings,teams=teams,country=country,failure=failure,unselected=unselected,mutation=mutation,pattern=pattern,result=signed(cpu.reg_read(UC_X86_REG_EAX)),callCount=len(calls),callsSha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executableSha256=digest,entry='0043E910',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} complete mission loads')
