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
parser.add_argument('--native-scheme',action='store_true')
parser.add_argument('--native-initializer',action='store_true')
parser.add_argument('--native-flags',action='store_true')
args = parser.parse_args()
args.native_initializer |= args.native_flags
args.native_scheme |= args.native_initializer
args.native_services |= args.native_scheme
globalBase,globalSize=(0x6da000,0x30000) if args.native_initializer else (0x6e0000,0x20000)
calls=[];initializing=False;clock=12345;storedSeed=None
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
cpu.mem_map(0x2400000,0x40000)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(globalBase,globalSize))+bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def setstring(obj,value):
 dest=scratch+(obj&0xfff)*8+16
 write(dest-8,len(value));cpu.mem_write(dest,value+b'\0');write(obj,dest)
write(0x517494,stop+0x800);write(0x51745c,stop+0x900)
write(0x5174a4,stop+0x100);write(0x5178f4,stop+0x200)
write(0x517954,stop+0x300);write(0x517950,stop+0x400);write(0x5174a8,stop+0x500)
def hook(cpu,address,size,user):
 global rng,storedSeed
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d48:setstring(cpu.reg_read(UC_X86_REG_ECX),b'');ret()
 elif address==0x503d24:ret()
 elif address==stop+0x300:
  if initializing:calls.append(['time',clock,snapshot()])
  ret(clock)
 elif address==stop+0x400:
  rng=read(sp+4);ret()
 elif address==0x503f10:
  key=cstring(read(sp+8)).decode();fallback=read(sp+12)
  if key in ['DetailLevel','EnergyBar']:
   calls.append(['option',key,fallback,snapshot()]);ret(5 if key=='DetailLevel' else 0,12)
  else:
   calls.append(['readSeed',fallback,snapshot()]);ret(fallback if storedSeed is None else storedSeed,12)
 elif address==0x503f16:
  storedSeed=read(sp+12);calls.append(['writeSeed',storedSeed,snapshot()]);ret(1,12)
 elif address==0x4703a0:
  calls.append(['handicap',snapshot()]);ret(0)
 elif address==stop+0xa00:
  value=cstring(read(sp+4));calls.append(['directory',value.hex(),snapshot()]);ret(int(mutation and value!=b'C:\\WORMS'))
 elif address==stop+0xb00:
  calls.append(['locale',snapshot()]);ret(0x409)
 elif address==stop+0xc00:
  a,b,n=read(sp+4),read(sp+8),read(sp+12);result=0
  for i in range(n):
   x,y=cpu.mem_read(a+i,1)[0],cpu.mem_read(b+i,1)[0]
   if x!=y:result=x-y;break
   if not x:break
  ret(result)
 elif address==0x503dc0:
  fmt=cstring(read(sp+8));
  value=fmt if b'%' not in fmt else fmt%(cstring(read(sp+12)),signed(read(sp+16))) if fmt==b'%s %d' else fmt%(cstring(read(sp+12)),cstring(read(sp+16))) if fmt==b'%s\\%s' else fmt%signed(read(sp+12))
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
  resource=read(sp+4);dest=cpu.reg_read(UC_X86_REG_ECX)
  if args.native_scheme and dest==0x6f4558:
   calls.append(['label',dest,resource,snapshot()]);write(dest,0x2500000+resource*4);ret(1,4);return
  calls.append(['string',resource,snapshot()]);setstring(cpu.reg_read(UC_X86_REG_ECX),resourceStrings.get(resource,b'') if originalTables else resourceStrings.get(resource,b''));ret(1,4)
 elif address==stop+0x800:
  module,resource,kind=read(sp+4),read(sp+8),cstring(read(sp+12)).decode()
  calls.append(['findResource',module,resource,kind,snapshot()]);ret(0x2400000+resource*256,12)
 elif address==stop+0x900:
  module,handle=read(sp+4),read(sp+8);calls.append(['loadResource',module,handle,snapshot()]);ret(handle,8)
 elif address==stop+0x200:
  fmt=cstring(read(sp+8));
  value=fmt if b'%' not in fmt else fmt%(read(sp+12)&255,cstring(read(sp+16))) if b'%c' in fmt and b'%s' in fmt else fmt%(read(sp+12)&255) if b'%c' in fmt else fmt%cstring(read(sp+12))
  if args.native_initializer and initializing and b'speech' in fmt:calls.append(['speech',b'%c' in fmt,(value+b'\0').hex(),snapshot()])
  cpu.mem_write(read(sp+4),value+b'\0');ret(len(value))
 elif address==stop+0x700:
  calls.append(['random',snapshot()]);rng=(rng*214013+2531011)&0xffffffff;ret((rng>>16)&32767)
 elif address==0x40f210:
  path=cstring(read(sp+4)).decode('cp1252');pixels,palette,width,height=[read(sp+i) for i in [8,12,16,20]]
  calls.append(['flagBitmap',path,pixels,palette,width,height,snapshot()]);write(palette,0x12345678);write(pixels,0x76543210);ret(1)
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
for address in [0x503d48,0x503d24,0x503dc0,0x503d42,0x503d2a,0x503d1e,0x503ec2,0x470a20,0x415540,0x4197d0,0x419610,0x419740,0x41b730,0x41bc40,*([0x40f210] if args.native_flags else []),stop+0x100,stop+0x200,stop+0x300,stop+0x400,stop+0x500,stop+0x600,stop+0x700,stop+0x800,stop+0x900,*([0x503f10,0x503f16,0x4703a0,stop+0xa00,stop+0xb00,stop+0xc00] if args.native_initializer else [])]:
 if args.native_flags and address==0x41bc40:continue
 if args.native_initializer and address==0x415540:continue
 if args.native_scheme and address==0x470a20:continue
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
  if name&0x80000000:
   pos=root+(name&0x7fffffff);length=struct.unpack_from('<H',data,pos)[0];name=data[pos+2:pos+2+length*2].decode('utf-16-le')
  if target&0x80000000:walk(target&0x7fffffff,path+[name])
  elif len(path)==2 and path[0]=='SCHEMES':
   rva,length=struct.unpack_from('<II',data,root+target);pos=fileoffset(rva);cpu.mem_write(0x2400000+path[1]*256,data[pos:pos+length])
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
  if args.native_initializer and not item&0x80000000:
   stub={b'_chdir':0xa00,b'GetSystemDefaultLCID':0xb00,b'strncmp':0xc00}.get(cstring(base+item+2))
   if stub:write(iat+i*4,stop+stub)
  i+=1
 p+=20
countryCases=[];flagCases=[]
if args.native_flags:
 for country in [-2147483648,-1,*range(52),2147483647]:
  for pattern in [0,0xa5]:
   cpu.mem_write(owner,bytes([pattern])*65);sp=stack+0xe000;write(sp,stop);write(sp+4,country);write(sp+8,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   cpu.emu_start(0x44c7b0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   countryCases.append(dict(country=country,pattern=pattern,result=signed(cpu.reg_read(UC_X86_REG_EAX)),bytes=bytes(cpu.mem_read(owner,65)).hex()))
 for country in range(1,50):
  for skill in [-128,-101,-100,-81,-80,-61,-60,-41,-40,-21,-20,-1,0,1,127]:
   for team in [0,5]:
    cpu.mem_write(globalBase,bytes(0x30000));cpu.mem_write(owner,bytes(0x10000));calls=[]
    write(0x6f47f4,country);cpu.mem_write(0x6e1178,bytes([67+team]));cpu.mem_write(owner+0x620+team*0xd7b,bytes([skill&255]))
    sp=stack+0xe000;write(sp,stop);write(sp+4,team);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x41bc40,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    flagCases.append(dict(country=country,skill=skill,team=team,calls=calls,sha256=snapshot()))
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
 if args.native_scheme and failure:continue
 for mutation in [0,1]:
  teams=profile.get('teams',{}).get('teamsinmission',1);pattern=0xa5 if mutation else 0;country=4 if mutation else 1
  cpu.mem_write(globalBase,bytes([pattern])*globalSize);cpu.mem_write(owner,bytes([pattern])*0x10000)
  initializing=False
  if args.native_initializer:
   cpu.mem_write(0x6de000,bytes(0x9000));cpu.mem_write(0x6daf90,bytes(0x1d8));write(0x6daf94,-1);cpu.mem_write(0x6db060,b'\xff'*264)
   if mutation:
    for offset,value in [(4,2),(8,-1),(12,3),(16,5),(20,-1)]:write(0x6daf90+offset,value)
   cpu.mem_write(0x6e11f8,b'\1');cpu.mem_write(0x6e18c0,b'\1')
   cpu.mem_write(0x6f4839,b'English'+bytes(58));cpu.mem_write(0x6f48bc,b'C:\\WORMS\0')
   write(0x6f49cc,2);write(0x6f49ec,0);write(0x6f49c4,1);storedSeed=None
  sp=stack+0xe000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43d6c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  write(owner+0x880,owner+0x1000);write(0x6f47f4,country);cpu.mem_write(0x6e6880,b'\1')
  if not unselected:write(owner+0x884,1);write(owner+0x54,1 if mutation else -1)
  if args.native_services:cpu.mem_write(0x6e1178,bytes([67+mutation]))
  rng=123+pattern
  calls=[];initializing=True;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43e910,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(profile=name,nativeFlags=args.native_flags,nativeInitializer=args.native_initializer,nativeScheme=args.native_scheme,nativeServices=args.native_services,values=profile,strings=strings,teams=teams,country=country,failure=failure,unselected=unselected,mutation=mutation,pattern=pattern,result=signed(cpu.reg_read(UC_X86_REG_EAX)),callCount=len(calls),callsSha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),sha256=snapshot(),**({'randomState':rng,'storedSeed':storedSeed} if args.native_initializer else {})))
schemeCases=[]
if args.native_scheme and not args.native_initializer:
 for selection in [-1,*range(19),2147483647]:
  for bank in [-1,0,1,3,4]:
   for pattern in [0,0xa5]:
    cpu.mem_write(globalBase,bytes([pattern])*globalSize);cpu.mem_write(owner,bytes([pattern])*0x10000);calls=[]
    sp=stack+0xe000;write(sp,stop);write(sp+4,selection);write(sp+8,bank);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,0x6f454c)
    cpu.emu_start(0x470a20,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    schemeCases.append(dict(selection=selection,bank=bank,pattern=pattern,result=signed(cpu.reg_read(UC_X86_REG_EAX)),calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executableSha256=digest,entry='0043E910',method='Full mission loader; native initializer mode composes00415540 against aliased globals with original scheme resources, teams, inventory settings, speech fallback, turn order, metadata, mission options/events and worm records. Profile/resource/flag, CString/CRT string, clock, directory and CRT random services remain interfaces. Full256KiB snapshots at every observed callback and after return, plus persisted seed and random state, are compared. Native flag mode additionally executes0041BC40 and0044C7B0; only bitmap loading remains intercepted, including deterministic pixel/palette writes.',cases=cases,schemeCases=schemeCases,countryCases=countryCases,flagCases=flagCases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} complete mission loads')
