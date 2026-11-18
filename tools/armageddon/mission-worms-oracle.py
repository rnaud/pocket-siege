"""Execute original mission worm placement and loadout block."""
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


cpu.mem_map(0,0x1000);scratch=0x2300000;cpu.mem_map(scratch,0x10000)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def setstring(obj,value):
 dest=scratch+(obj&0xfff)*8+16;write(dest-8,len(value));cpu.mem_write(dest,value+b'\0');write(obj,dest)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(0x6e0000,0x20000))+bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
write(0x5174a4,stop+0x100);write(0x517954,stop+0x300);write(0x517950,stop+0x400)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x503d48:setstring(cpu.reg_read(UC_X86_REG_ECX),b'');ret()
 elif address in [0x503d24,stop+0x300,stop+0x400]:ret()
 elif address==0x503d2a:
  dest=cpu.reg_read(UC_X86_REG_ECX);setstring(dest,cstring(read(sp+4)));ret(dest,4)
 elif address==0x503d1e:
  dest=cpu.reg_read(UC_X86_REG_ECX);write(dest,read(read(sp+4)));ret(dest,4)
 elif address==0x503dc0:setstring(read(sp+4),cstring(read(sp+8))%signed(read(sp+12)));ret()
 elif address==stop+0x100:
  section,key=cstring(read(sp+4)).decode(),cstring(read(sp+8)).decode();fallback=signed(read(sp+12));filename=read(sp+16)
  calls.append(['profile',section,key,fallback,filename,snapshot()])
  if mutation:write(owner+0x880,owner+0x1100 if filename==owner+0x1000 else owner+0x1000)
  values=profile.get(section.lower(),{})
  ret(values.get(key.lower(),values.get('*',fallback)),16)
for address in [0x503d48,0x503d24,0x503d2a,0x503d1e,0x503dc0,stop+0x100,stop+0x300,stop+0x400]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
profiles=[]
for record in json.loads(Path('src/armageddon/mission-catalog.json').read_text())['records']:
 profile={}
 for section in record['sections']:
  values=profile.setdefault(section['name'].lower(),{})
  for key,value in section['entries']:
   try:values.setdefault(key.lower(),int(value,10))
   except ValueError:pass
 teams=profile.get('teams',{}).get('teamsinmission',1)
 counts=[profile.get('humanteam',{}).get('numberofworms',1)]+[profile.get(f'cputeam{i}',{}).get('numberofworms',1) for i in range(1,teams)]
 groups=[profile.get(f'cputeam{i}',{}).get('alliedgroup',1) for i in range(1,teams)]
 profiles.append((record['source'],profile,counts,groups))
for value in [-2147483648,-65537,-1,0,1,65535,65536,2147483647]:
 profile={section:{'*':value,**{f'worm{i}_fixedweapon':i*10 for i in range(1,9)}} for section in ['humanteam']+[f'cputeam{i}' for i in range(1,6)]}
 profiles.append((str(value),profile,[3,2,1,0,255,128],[-1,0,1,4,5]))
cases=[]
for name,profile,counts,groups in profiles:
 for mutation in [0,1]:
  pattern=0xa5 if mutation else 0
  cpu.mem_write(0x6e0000,bytes([pattern])*0x20000);cpu.mem_write(owner,bytes([pattern])*0x10000)
  sp=stack+0xe000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x43d6c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  write(owner+0x880,owner+0x1000);write(owner+0x54,1 if mutation else -1)
  cpu.mem_write(0x6e1834,bytes([counts[0]&255]));cpu.mem_write(0x6e69c6,bytes([len(counts)]))
  for i,count in enumerate(counts[1:]):
   cpu.mem_write(0x6e2518+i*0xd7b,bytes([groups[i]&255]));cpu.mem_write(0x6e25af+i*0xd7b,bytes([count&255]))
  calls=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBP,owner);cpu.reg_write(UC_X86_REG_EDI,0);cpu.reg_write(UC_X86_REG_EBX,stop+0x100)
  cpu.emu_start(0x43ee47,0x43f245,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==0x43f245
  cases.append(dict(profile=name,values=profile,counts=counts,groups=groups,mutation=mutation,pattern=pattern,callCount=len(calls),callsSha256=hashlib.sha256(json.dumps(calls,separators=(',',':')).encode()).hexdigest(),sha256=snapshot()))
args.output.write_text(json.dumps(dict(executableSha256=digest,entry='0043EE47..0043F245',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} mission worm/loadout blocks')
