"""Execute complete original frontend loadout builder and capture its tables."""
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

originalGetters={address:bytes(cpu.mem_read(address,3)) for address in [0x470370,0x470340]}
for address,argc in [(0x470370,1),(0x470340,1)]:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def hook(cpu,address,size,user):
 global tables,descriptorAddress
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x418b8e and tables is None:
  words=list(struct.unpack('<376i',cpu.mem_read(sp+0x28,376*4)))
  def pairs(start):
   result=[]
   while words[start]!=-1:result.append(words[start:start+2]);start+=2
   return result
  delays=[];p=sp+0x608
  while signed(read(p))!=-1:
   slot,value=signed(read(p)),signed(read(p+4));delays.append([slot,'getter' if value>=1000 else 'byte' if value else 'constant',value-1000 if value>=1000 else (value-1)*4+2 if value else 0]);p+=8
  tables=dict(ammo=pairs(0x66),presets={str(k):pairs(v) for k,v in {1:0,2:0x1c,3:0xc,6:6,8:0x14,9:0x58,13:0x4a,14:0x3c,15:0x26,16:0x30,17:0xf4}.items()},delays=delays)
 elif address in [0x470370,0x470340]:
  slot=read(sp+4);value=(1000+slot if mapping else delaysInput[slot]) if address==0x470370 else counts[slot]
  calls.append(['delay' if address==0x470370 else 'count',slot])
  if mapping:
   descriptorAddress=cpu.reg_read(UC_X86_REG_ECX);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
 elif address in [0x476070,0x41b760]:
  team=(read(sp+4)-owner-0x122)//3000
  calls.append(['stats' if address==0x476070 else 'special',team])
for address in [0x418b8e,0x470370,0x470340,0x476070,0x41b760]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def run():
 sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x417750,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
# Unique source bytes/getter results identify delay sources; static lists come
# directly from original stack writes, not a hand-transcribed weapon mapping.
tables=None;mapping=True;calls=[];counts=[0]*71;delaysInput=[0]*71
cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(0x6f4560,bytes((i//4+1) if i%4==2 else 0 for i in range(216)));write(0x6f4554,0);write(0x6daf94,0xffffffff)
run();mapping=False
for address,code in originalGetters.items():
 cpu.mem_write(address,code);cpu.ctl_remove_cache(address,address+64)
Path('src/armageddon/inventory-setup-tables.json').write_text(json.dumps(tables,separators=(',',':'))+'\n')
output=owner+0x20000;cpu.mem_map(output,0x10000)
cases=[]
for preset in [0,1,2,3,6,8,9,13,14,15,16,17]:
 for stockpile in [0,1,2]:
  for round in [0,1]:
   for special in [0,1]:
    calls=[];writes=[[0x38,4,round],[0x3c,1,0],[0xcd74,1,3],[0x11a,1,3],[0xd5fb,1,special]];names=[]
    for team,bank in enumerate([0,0,2]):
     writes += [[0x11c+team*3000,1,team],[0x11e+team*3000,1,int(team==2 and preset%2==1)],[0x11f+team*3000,1,bank],[0xcd0+team*3000,1,3]]
     names.append([0x122+team*3000,'Team'+str(team)])
     for worm in range(3):
      writes.append([0xb90+team*3000+worm*40,2,[0,100,65535][worm]])
      names.append([0xb93+team*3000+worm*40,'Worm'+str(worm)])
    cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
    for off,size,value in writes:cpu.mem_write(owner+off,value.to_bytes(size,'little'))
    for offset,name in names:cpu.mem_write(owner+offset,name.encode()+b'\0')
    scheme=[0]*216
    for i in range(0x24,216,4):scheme[i]=[0,1,3,10,255][(i//4+preset)%5];scheme[i+2]=[0,1,127,128,255][(i//4+preset)%5]
    scheme[8]=stockpile;scheme[0x22]=special;cpu.mem_write(0x6f4560,bytes(scheme));write(0x6f4554,preset)
    extras=[[6,2],[40,-1]] if preset%2 else []
    for i,value in enumerate([v for pair in extras for v in pair]+[-1,-1]):write(0x6daf94+i*4,value)
    counts=[(i+preset)%2 for i in range(71)];delaysInput=[[0,1,-1,32767,65535][(i+preset)%5] for i in range(71)]
    cpu.mem_write(0x6de000,bytes(0x9000))
    teamRecords=[]
    # Reverse saved records and rotate special records: identity is by name.
    for team in range(3):
     statsIndex=2-team;specialIndex=(team+preset)%6
     teamRecords.append([team,statsIndex,specialIndex])
     cpu.mem_write(0x6dec30+statsIndex*0x39c,('Team'+str(team)).encode()+b'\0')
     cpu.mem_write(0x6dec41+statsIndex*0x39c,b'\1')
     cpu.mem_write(0x6e179f+specialIndex*0xd7b,('Team'+str(team)).encode()+b'\0')
     cpu.mem_write(0x6e18c0+specialIndex*0xd7b,b'\1')
    saved=[];specials=[]
    for team in range(3):
     row=[[-1,0,2,32767][(slot+team)%4] for slot in range(71)];saved.append(row)
     cpu.mem_write(0x6de508+(2-team)*0x8e,struct.pack('<71h',*row));specials.append((team+preset)%9);cpu.mem_write(0x6e18c1+((team+preset)%6)*0xd7b,bytes([specials[-1]]))
    descriptors=[]
    for index in range(22):
     slot=([19,62,10,30,50,31,55,19]+list(range(40,54)))[index]
     if preset%2:slot=(slot+preset)%71
     count=counts[slot];delay=delaysInput[(slot+index)%71]
     descriptors.append([slot,count,delay])
     cpu.mem_write(descriptorAddress+0xd0+index*12,struct.pack('<iii',slot,count,delay))
    getterResults=[]
    for slot in range(71):
     values=[]
     for entry in [0x470340,0x470370]:
      sp=stack+0xf000;write(sp,stop);write(sp+4,slot)
      cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,descriptorAddress)
      cpu.emu_start(entry,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
      values.append(signed(cpu.reg_read(UC_X86_REG_EAX)))
     getterResults.append(values)
    calls=[]
    run()
    cpu.mem_write(output,bytes(0x2c14));sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0x3c)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,output)
    cpu.emu_start(0x4c2640,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(team_records=teamRecords,getter_results=getterResults,descriptors=descriptors,names=names,inventory_sha256=hashlib.sha256(cpu.mem_read(output,0x2c14)).hexdigest(),preset=preset,writes=writes,scheme=scheme,counts=counts,delays=delaysInput,extras=extras,saved=saved,specials=specials,calls=calls,sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
lookups=[]
for active in [0,1,255]:
 for position in range(6):
  cpu.mem_write(0x6de000,bytes(0x9000));writes=[]
  for index in range(6):
   name=b'ABCDEFGHIJKLMNOP'+(b'A' if index==position else b'B')+b'\0'
   # Stats flag occupies byte17, so bounded name comparison is essential.
   for offset,value in [(0xc30+index*0x39c,name),(0xc41+index*0x39c,bytes([active if index==position else 0])),
                        (0x379f+index*0xd7b,name),(0x38c0+index*0xd7b,bytes([active if index==position else 0]))]:
    cpu.mem_write(0x6de000+offset,value);writes.append([offset,value.hex()])
  for query in [b'ABCDEFGHIJKLMNOPA',b'ABCDEFGHIJKLMNOPB',b'abcdefgh',b'',b'ABCDEFGHIJKLMNOP',bytes([255])*16]:
   cpu.mem_write(owner,query+b'\0');results=[]
   for entry in [0x476070,0x41b760]:
    sp=stack+0xf000;write(sp,stop);write(sp+4,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(entry,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    results.append(signed(cpu.reg_read(UC_X86_REG_EAX)))
   lookups.append(dict(writes=writes,name=(query+b'\0').hex(),results=results))
preparations=[]
for scheme in json.loads(Path('src/armageddon/scheme-data.json').read_text())['schemes']:
 for special in [0,1,2,255]:
  initial=bytearray((i*11+5)&255 for i in range(0x1c4));initial[0x14:0xec]=bytes(scheme['bytes']);initial[0x36]=special
  cpu.mem_write(0x6f454c,bytes(initial));write(0x6f4554,0)
  # Preset is part of the supplied scheme-state header.
  initial[8:12]=bytes(4)
  cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
  for off,size,value in cases[0]['writes']:cpu.mem_write(owner+off,value.to_bytes(size,'little'))
  for offset,name in cases[0]['names']:cpu.mem_write(owner+offset,name.encode()+b'\0')
  cpu.mem_write(0x6de000,bytes(0x9000))
  cpu.mem_write(descriptorAddress+0xd0,b'\xff'*264);write(0x6daf94,0xffffffff)
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x415540,0x4156c0,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4156c0
  prepared=bytes(cpu.mem_read(0x6f454c,0x1c4));run()
  cpu.mem_write(output,bytes(0x2c14));sp=stack+0xf000;write(sp,stop);write(sp+4,owner+0x3c)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,output)
  cpu.emu_start(0x4c2640,stop,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  preparations.append(dict(resource_id=scheme['resource_id'],special=special,initial=bytes(initial).hex(),prepared=prepared.hex(),
    setup_sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest(),inventory_sha256=hashlib.sha256(cpu.mem_read(output,0x2c14)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,runtime_sha256=runtime_digest,lookups=lookups,preparations=preparations,entry='00417750 / 004C2640',method='Complete original loadout builder; Original scheme count/delay getters and first-match table search execute; original saved-team and special-team name searches execute, using bundled CRT strncmp. Native special-delay gate and all stockpile/preset/special arithmetic execute. Every setup byte and interface call compared; original runtime initialization executes afterward and all inventory output bytes are captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} loadout builds')
