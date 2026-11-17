"""Execute original worm damage accounting instructions in Unicorn.

Original worm damage accounting instructions execute; team health storage is supplied and events captured. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]




context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
vtable,state_fn=owner+0x2000,owner+0x3000;write(owner,vtable);write(vtable+0x7c,state_fn);cpu.mem_write(state_fn,b'\xc3')
for addr,n in [(0x4c2cc0,8),(0x4c2e50,8),(0x4c2dd0,12),(0x4c2e10,12),(0x4b26a0,24)]:cpu.mem_write(addr,b'\xc2'+struct.pack('<H',n))
health=0;total=0;events=[];native_state=0
write(owner+0xfc,2);write(owner+0x100,3)
def capture(cpu,address,size,user):
 global health,total
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c2cc0:cpu.reg_write(UC_X86_REG_EAX,health)
 elif address==0x4c2e50:cpu.reg_write(UC_X86_REG_EAX,total)
 elif address==0x4c2dd0:total=read(sp+12)
 elif address==0x4c2e10:health=read(sp+12)
 elif address==state_fn:cpu.reg_write(UC_X86_REG_EAX,native_state)
 else:events.append(list(struct.unpack('<4i',cpu.mem_read(read(sp+24),16))))
for addr in [0x4c2cc0,0x4c2e50,0x4c2dd0,0x4c2e10,0x4b26a0,state_fn]:cpu.hook_add(UC_HOOK_CODE,capture,begin=addr,end=addr)
cases=[]
for hp in [0,10,100]:
 for damage in [-1,0,5,120]:
  for multiplier in [0,1,2]:
   for immune,force,uncapped in [(0,0,0),(1,0,0),(1,1,0),(0,0,1)]:
    for native_state in [0x65,0x6d]:
     health=hp;total=7;events=[];write(context+0x1abc,immune);cpu.mem_write(context+0x11d66,bytes([uncapped]));write(owner+0x188,9);write(owner+0x180,12);write(owner+0x184,1)
     sp=stack+0xf000
     for i,value in enumerate([stop,damage,force,multiplier]):write(sp+i*4,value&0xffffffff)
     cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4d8440,stop,count=10000)
     if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Damage accounting failed to return')
     displayed=read(owner+0x188);displayed=displayed if displayed<0x80000000 else displayed-0x100000000
     cases.append(dict(hp=hp,damage=damage,multiplier=multiplier,immune=immune,force=force,uncapped=uncapped,state=native_state,result=dict(hp=health,total=total,displayed=displayed,reset=read(owner+0x180),events=events)))
# Presentation004DCEF0 executes its original fixed multiply and clamp.
position=owner+0x3100
write(vtable+0x5c,position);cpu.mem_write(position,b'\xc2\x08\x00')
for address in [0x4eebe0,0x4aab40]:cpu.mem_write(address,b'\xc3')
def presentation_capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4eebe0:display_calls.append(dict(operation='busy'))
 elif address==0x4aab40:display_calls.append(dict(operation='healthText',value=struct.unpack('<i',cpu.mem_read(sp+8,4))[0]))
for address in [0x4eebe0,0x4aab40]:cpu.hook_add(UC_HOOK_CODE,presentation_capture,begin=address,end=address)
fields=dict(value=0x178,target=0x17c,progress=0x180,active=0x184,pending=0x188)
def read_display():return {key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in fields.items()}
presentation=[]
for value,target in [(100<<16,100<<16),(100<<16,50<<16),(10<<16,0),(0,100<<16),(-65536,0),(10000<<16,10001<<16),(0x7fffffff,-2147483648)]:
 for hp in [0,50,110]:
  for active,progress in [(0,0),(1,0),(1,0xfc6a),(1,0xfc6b),(1,0x7fffffff)]:
   initial=dict(value=value,target=target,active=active,progress=progress,pending=7)
   for key,offset in fields.items():write(owner+offset,initial[key]&0xffffffff)
   health=hp;display_calls=[]
   sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4dcef0,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Health display did not return')
   presentation.append(dict(input=initial,hp=hp,result=dict(body=read_display(),calls=display_calls)))
reveals=[]
for hp in [0,17,100]:
 for pending in [0,5,125,-1]:
  initial=dict(value=100<<16,target=100<<16,active=0,progress=99,pending=pending)
  for key,offset in fields.items():write(owner+offset,initial[key]&0xffffffff)
  health=hp;total=123;display_calls=[]
  sp=stack+0xf000;cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,0)
  # zero pending branches out of this event directly.
  cpu.emu_start(0x4dafb9,0x4db035 if pending else 0x4db56f,count=10000)
  expected=0x4db035 if pending else 0x4db56f
  if cpu.reg_read(UC_X86_REG_EIP)!=expected:raise RuntimeError('Health reveal did not reach boundary')
  calls=[dict(operation='damageText',value=c['value']) for c in display_calls]
  if pending:calls.append(dict(operation='clearDamageTotal'))
  reveals.append(dict(input=initial,hp=hp,result=dict(body=read_display(),calls=calls)))
# Entire004C2A00 runs against native team/worm storage, including aliasing.
statistics=[]
stat_fields=dict(hp=-0x538,enemyKills=-0x534,enemyDamage=-0x530,allyKills=-0x52c,allyDamage=-0x528,damageReceived=-0x524,turnKills=-0x520,lastAttackerTeam=-0x504,lastAttackerWorm=-0x500)
stats_base=context+0x1b94
signed=lambda at:struct.unpack('<i',cpu.mem_read(at,4))[0]
for relation in ['self','friend','enemy','alliedTeam','revenge','absent']:
 for hp in [0,1,100]:
  for damage in [1,25,100,-1,0x7fffffff]:
   for initial in [0,5,0x7fffffff]:
    roster=[]
    for team,worm in [(1,1),(1,2),(2,1)]:
     alliance=1 if relation=='alliedTeam' else team
     row=dict(team=team,worm=worm,alliance=alliance,**{key:initial for key in stat_fields})
     row['hp']=hp if (team,worm)==(1,1) else 100
     if relation=='revenge' and team==2:row.update(lastAttackerTeam=1,lastAttackerWorm=1)
     roster.append(row)
     write(stats_base+team*0x51c+8,alliance)
     cpu.mem_write(context+team*3000+0x3cd3,bytes([alliance]))
     at=stats_base+team*0x51c+worm*0x9c
     for key,offset in stat_fields.items():write(at+offset,row[key]&0xffffffff)
    source={'self':0,'friend':1,'enemy':2,'alliedTeam':2,'revenge':2,'absent':None}[relation]
    source_team,source_worm=(roster[source]['team'],roster[source]['worm']) if source is not None else (0,0)
    write(stats_base+4,initial);write(stats_base+8,initial)
    sp=stack+0xf000
    for i,value in enumerate([stop,1,1,source_team,source_worm,damage & 0xffffffff]):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,stats_base)
    cpu.emu_start(0x4c2a00,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Match statistics did not return')
    after=[]
    for row in roster:
     at=stats_base+row['team']*0x51c+row['worm']*0x9c
     after.append(dict(row,**{key:signed(at+offset) for key,offset in stat_fields.items()}))
    reaction_fields=dict(kills=0x1a0,damage=0x1a4,revengeTeam=0x1bc,friendlyTeam=0x1c0,selfTeam=0x1c4,maxDamage=0x1d0,maxVictimTeam=0x1d4)
    reaction_before={key:initial for key in reaction_fields}
    for key,offset in reaction_fields.items():write(owner+offset,initial)
    health=hp;sp=stack+0xf000
    for i,value in enumerate([stop,1,1,source_team,source_worm,damage & 0xffffffff]):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4b42b0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Damage reaction recording did not return')
    reaction_after={key:signed(owner+offset) for key,offset in reaction_fields.items()}
    statistics.append(dict(reactionBefore=reaction_before,reactionAfter=reaction_after,match=dict(damage=initial,deaths=initial),roster=roster,source=source,damage=damage,result=dict(match=dict(damage=signed(stats_base+8),deaths=signed(stats_base+4)),roster=after)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004D8440',method='Original damage accounting; supplied health/cumulative damage storage, state getter, captured event0x430. Presentation executes004DCEF0 and reveal prefix004DAFB9..004DB035 with health store and text sink supplied.',cases=cases,presentation=presentation,reveals=reveals,statistics=statistics),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} damage accounting cases')
