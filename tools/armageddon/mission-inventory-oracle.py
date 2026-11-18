"""Execute original mission ammo/delay orchestration and updates."""
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
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('ascii')
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(0x6f0000,0x10000))+bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
write(0x5174a4,stop+0x100)
def short(address,value):cpu.mem_write(address,struct.pack('<H',value&65535))
def hook(cpu,address,size,user):
 global pending
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d1e:
  dst=cpu.reg_read(UC_X86_REG_ECX);write(dst,read(read(sp+4)));ret(dst,4)
 elif address==0x503d24:ret()
 elif address in [0x440470,0x440510]:
  kind='ammo' if address==0x440470 else 'delay'
  slot=read(sp+8);key=cstring(read(sp+16));schema.append([kind,slot,key]);pending=(0x6f3624 if kind=='ammo' else 0x6f36b2)+(read(sp+12)*143+slot)*2
 elif address==stop+0x100:
  section,key=cstring(read(sp+4)),cstring(read(sp+8));fallback=signed(read(sp+12));filename=read(sp+16)
  calls.append([section,key,fallback,filename,snapshot()])
  if mutation:
   if len(calls)%11==0:short(pending,32760)
   write(owner+0x880,owner+0x1100 if filename==owner+0x1000 else owner+0x1000)
  ret(values.get(key.lower(),values.get('*',fallback)),16)
for address in [0x503d1e,0x503d24,0x440470,0x440510,stop+0x100]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
profiles=[]
for record in json.loads(Path('src/armageddon/mission-catalog.json').read_text())['records']:
 for section in record['sections']:
  if section['name'].lower()!='humanteam' and not section['name'].lower().startswith('cputeam'):continue
  values={}
  for key,value in section['entries']:
   try:values.setdefault(key.lower(),int(value,10))
   except ValueError:pass
  profiles.append((record['source'],section['name'],values))
profiles.append(('defaults','HumanTeam',{}))
for value in [-2147483648,-65537,-1,0,1,65535,65536,2147483647]:profiles.append((str(value),'CPUTeam5',{'*':value}))
cases=[];expectedSchema=None
for name,section,values in profiles:
 for mutation in [0,1]:
  pattern=0xa5 if mutation else 0;team=5 if mutation else 0
  cpu.mem_write(0x6f0000,bytes([pattern])*0x10000);cpu.mem_write(owner,bytes([pattern])*0x10000);write(owner+0x880,owner+0x1000)
  cpu.mem_write(owner+0x2000,section.encode()+b'\0')
  for i in range(71):
   for base in [0x6f3624,0x6f36b2]:short(base+(team*143+i)*2,[-1,0,1,32767,-32768,123][i%6] if mutation else 0)
  calls=[];schema=[];sp=stack+0xf000
  for i,value in enumerate([stop,owner+0x2000,team]):write(sp+i*4,value)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43f2e0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  if expectedSchema is None:expectedSchema=schema
  assert schema==expectedSchema
  cases.append(dict(profile=name,section=section,values=values,mutation=mutation,pattern=pattern,team=team,callCount=len(calls),callsSha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),sha256=snapshot()))
Path('src/armageddon/mission-inventory-keys.json').write_text(json.dumps(dict(executableSha256=digest,entries=expectedSchema),indent=2)+'\n')
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} full mission inventories; {len(expectedSchema)} ordered fields each')
