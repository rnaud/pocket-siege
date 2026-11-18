"""Execute original mission scheme/options loaders with profile and device interfaces."""
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


def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('ascii')
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(0x6f0000,0x10000))+bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
write(0x5174a4,stop+0x100)
def hook(cpu,address,size,user):
 global countCalls
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  section,key=cstring(read(sp+4)),cstring(read(sp+8));fallback=signed(read(sp+12));filename=read(sp+16)
  calls.append(['profile',section,key,fallback,filename,snapshot()])
  value=values.get(section.lower(),{}).get(key.lower(),fallback)
  if mutation:write(owner+0x880,owner+0x1000 if filename!=owner+0x1000 else owner+0x1100)
  ret(value,16)
 elif address==0x470a20:
  calls.append(['scheme',cpu.reg_read(UC_X86_REG_ECX),read(sp+4),read(sp+8),snapshot()])
  if not failure:write(0x6f4560,0x12345678)
  ret(-1 if failure else 0,8)
 elif address==0x419740:
  calls.append(['music',signed(read(sp+4)),snapshot()]);write(0x6f3e97,0x12345678);ret(0,4)
 elif address==0x41b730:
  calls.append(['teams',snapshot()]);result=teams if not mutation or countCalls==0 else max(0,teams-1);countCalls+=1;ret(result)
for address in [stop+0x100,0x470a20,0x419740,0x41b730]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
profiles=[]
for record in json.loads(Path('src/armageddon/mission-catalog.json').read_text())['records']:
 values={}
 for section in record['sections']:
  bucket=values.setdefault(section['name'].lower(),{})
  for key,value in section['entries']:
   try:bucket.setdefault(key.lower(),int(value,10))
   except ValueError:pass
 profiles.append((record['source'],values))
keys={section:set() for section in ['options','enviroment','mission']}
for _,values in profiles:
 for section in keys:keys[section].update(values.get(section,{}))
profiles.append(('defaults',{}))
for v in [-2147483648,-65537,-1,0,1,3,65536,2147483647]:
 profiles.append((str(v),{section:{key:v for key in names} for section,names in keys.items()}))
cases=[]
for name,values in profiles:
 for mutation in [0,1]:
  for operation,entry in [('scheme',0x440670),('options',0x440860)]:
   for failure in ([0,1] if operation=='scheme' else [0]):
    pattern=0xa5 if mutation else 0;teams=6 if mutation else 2
    cpu.mem_write(0x6f0000,bytes([pattern])*0x10000);cpu.mem_write(owner,bytes([pattern])*0x10000);write(owner+0x880,owner+0x1000)
    calls=[];countCalls=0;sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(entry,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(profile=name,values=values,mutation=mutation,pattern=pattern,teams=teams,operation=operation,failure=failure,calls=calls,sha256=snapshot(),result=signed(cpu.reg_read(UC_X86_REG_EAX)) if operation=='scheme' else None))
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original mission option loads')
