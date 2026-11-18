"""Execute original initial match setup through loadout construction and inventory import."""
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
parser.add_argument('--runtime',type=Path,required=True)
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


# Map the bundled runtime at its preferred address; no DLL entry point runs.
runtime=args.runtime.read_bytes();runtime_digest=hashlib.sha256(runtime).hexdigest()
assert runtime_digest=='df9f2aab7f7119f214c5d743d961fde4bf324f19011fbbb7e9cf666856fba0ba'
pe=struct.unpack_from('<I',runtime,60)[0];opt=pe+24
runtime_base=struct.unpack_from('<I',runtime,opt+28)[0]
size=struct.unpack_from('<I',runtime,opt+56)[0]
cpu.mem_map(runtime_base,(size+0xfff)&~0xfff)
cpu.mem_write(runtime_base,runtime[:struct.unpack_from('<I',runtime,opt+60)[0]])
headers=opt+struct.unpack_from('<H',runtime,pe+20)[0]
for i in range(struct.unpack_from('<H',runtime,pe+6)[0]):
 _,rva,size,offset=struct.unpack_from('<IIII',runtime,headers+40*i+8)
 if size:cpu.mem_write(runtime_base+rva,runtime[offset:offset+size])
exports=runtime_base+struct.unpack_from('<I',runtime,opt+96)[0]
functions=runtime_base+read(exports+28);names=runtime_base+read(exports+32);ordinals=runtime_base+read(exports+36)
for i in range(read(exports+24)):
 address=runtime_base+read(names+i*4);name=bytes(cpu.mem_read(address,32)).split(b'\0')[0]
 if name==b'strncmp':
  ordinal=struct.unpack('<H',cpu.mem_read(ordinals+i*2,2))[0]
  write(0x51796c,runtime_base+read(functions+ordinal*4));break
else:raise RuntimeError('strncmp export missing')

# Original CRT arithmetic executes; only its thread-data accessor is supplied.
thread=stop+0x8000
cpu.mem_write(0x78009cb0,b'\xb8'+struct.pack('<I',thread)+b'\xc3')
write(0x517950,0x78023170);write(0x517918,0x78023180)
timeStub=stop+0x100;cpu.mem_write(timeStub,b'\xc3');write(0x517954,timeStub)
for address in [0x503f10,0x503f16]:cpu.mem_write(address,b'\xc2\x0c\x00')
def hook(cpu,address,size,user):
 global profile
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==timeStub:
  calls.append(['time',clock]);cpu.reg_write(UC_X86_REG_EAX,clock)
 elif address==0x503f10:
  fallback=read(sp+12);calls.append(['read',fallback]);cpu.reg_write(UC_X86_REG_EAX,fallback if profile is None else profile)
 elif address==0x503f16:
  profile=read(sp+12);calls.append(['write',profile]);cpu.reg_write(UC_X86_REG_EAX,1)
for address in [timeStub,0x503f10,0x503f16]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cpu.mem_map(0,0x1000)
sprintf=stop+0x200;cpu.mem_write(sprintf,b'\xc3');write(0x5178f4,sprintf);cpu.mem_write(0x4703a0,b'\xc3')
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def teamHook(cpu,address,size,user):
 if address==0x4703a0:
  calls.append(['handicap']);cpu.reg_write(UC_X86_REG_EAX,handicap)
 elif address==sprintf:
  sp=cpu.reg_read(UC_X86_REG_ESP);dest,fmt,arg=read(sp+4),cstring(read(sp+8)),read(sp+12)
  value=fmt%(arg if b'%c' in fmt else cstring(arg));cpu.mem_write(dest,value+b'\0')
  paths.append(value.hex()+'00');calls.append(['speech',b'%c' in fmt]);cpu.reg_write(UC_X86_REG_EAX,len(value))
for address in [sprintf,0x4703a0]:cpu.hook_add(UC_HOOK_CODE,teamHook,begin=address,end=address)
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
templates=[r for r in json.loads(Path('tests/fixtures/armageddon/team-setup.json').read_text())['cases'] if next(v for o,n,v in r['writes'] if o==0x6880)==3 and r['scheme'][0x15]==100]
cases=[]
for scheme in json.loads(Path('src/armageddon/scheme-data.json').read_text())['schemes']:
 for templateIndex,template in enumerate(templates):
  frontend=bytearray((i*13+7)&255 for i in range(0x7000))
  available=templateIndex%2==1
  writes=template['writes']+[[0x687e,1,(templateIndex//2)%2]]+[[0x179c+i*0xd7b+0x14+64,1,0] for i in range(6)]+[[0x11f4+i*0x78,4,[2,12,44,50][(i+2)%4]] for i in range(-2,13)]
  for off,size,value in writes:frontend[off:off+size]=(value&((1<<(size*8))-1)).to_bytes(size,'little')
  frontend[0x1178]=ord('D');cpu.mem_write(0x6de000,bytes(0x9000));cpu.mem_write(0x6e0000,bytes(frontend))
  cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
  initial=bytearray(0x1c4);initial[0x14:0xec]=bytes(scheme['bytes']);cpu.mem_write(0x6f454c,bytes(initial))
  cpu.mem_write(0x6daf90+0xd0,b'\xff'*264);write(0x6daf94,0xffffffff);write(0x6daf90+0xc0,0);write(0x6daf90+0xc8,0)
  cpu.mem_write(0x6f48bc,b'C:\\WORMS\0');handicap=template['handicap'];clock=0x80000000;profile=None if templateIndex%2 else 0xffffffff
  cpu.mem_write(0x6f4839,b'English'+bytes(58))
  initialProfile=profile;calls=[];paths=[];write(thread+0x14,1)
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x415540,0x4175ea,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4175ea
  cpu.mem_write(output,bytes(0x2c14));sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0x3c)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,output)
  cpu.emu_start(0x4c2640,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(resource_id=scheme['resource_id'],directory_available=available,writes=writes,handicap=handicap,initial_scheme=bytes(initial).hex(),clock=clock,initial_profile=initialProfile,
    profile=profile,random_state=read(thread+0x14),paths=paths,calls=calls,scheme=bytes(cpu.mem_read(0x6f454c,0x1c4)).hex(),
    sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest(),inventory_sha256=hashlib.sha256(cpu.mem_read(output,0x2c14)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,runtime_sha256=runtime_digest,entry='00415540..004175EA /004C2640',method='Original scheme preparation, team records, persistent seed/CRT, starting order, loadouts, weapon settings, CRT reseed, environment expansion and inventory import compose. Speech fallback and country selection execute; resource probes, CString/bounded-copy interfaces, speech formatting, handicap enablement, time/profile and CRT thread data are interfaces. Complete setup, inventory, scheme, seed state and ordered boundary calls compared.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} initial match setups')
