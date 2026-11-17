"""Execute original turn-start controller initialization."""
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)

fields={'activeTeam':0x128,'activeWorm':0x12c,'selectedTeam':0x130,'selectedWorm':0x134,'lastTeam':0x138,'field164':0x164,'field168':0x168,'turnState':0x16c,'retreatPending':0x170,'retreatRemaining':0x174,'retreatDuration':0x178,'matchTime':0x180,'turnDuration':0x184,'turnRemaining':0x188,'clockTarget':0x190,'field1e0':0x1e0,'field1e4':0x1e4,'positionX':0x1e8,'positionY':0x1ec,'turnCount':0x1f4,'field204':0x204,'teamHealth':0x208,'teamHealthCopy':0x20c,'panelTarget':0x78}
shared={'activity':0x1ac8,'schemeMode':0x810,'mode':0x814,'rate':0x818,'inputMode':0x820,'cameraHold':0x12418,'field1d438':0x1d438,'field1d43c':0x1d43c,'field1d440':0x1d440,'field1d444':0x1d444,'field1d448':0x1d448,'computerTeam':0x1d42c}
registry=context+0x1b94
write(owner,owner+0x1000);write(owner+0x1008,stop+0x100)
worm=owner+0x2000;write(worm,owner+0x2100);write(owner+0x215c,stop+0x200);write(owner+0x210c,stop+0x300)
lang=owner+0x3000;write(lang,owner+0x3100);write(owner+0x313c,stop+0x400);write(context+0x1c,lang)
calls=[];deployment=0
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4b26a0:
  calls.append({'operation':'targetEvent','event':read(sp+16),'team':read(sp+12)});ret(0,24)
 elif address==stop+0x100:
  calls.append({'operation':'event','event':read(sp+8)});ret(0,16)
 elif address==0x4ccf50:calls.append({'operation':'wormLookup'});ret(worm,8)
 elif address==stop+0x200:
  calls.append({'operation':'position'});write(read(sp+4),123<<16);write(read(sp+8),-25<<16);ret(0,8)
 elif address==stop+0x300:
  calls.append({'operation':'wormRecord'});write(read(sp+12),123<<16);ret(0,12)
 elif address==0x4b3110:calls.append({'operation':'wind','x':signed(read(sp+4))});ret(0,4)
 elif address==stop+0x400:calls.append({'operation':'timeWarningText'});ret(1)
 elif address==0x4eeee0:calls.append({'operation':'timeWarning'});ret(0,12)
 elif address==0x4c3a10:calls.append({'operation':'deploymentPending'});ret(deployment)
cpu.hook_add(UC_HOOK_CODE,hook)
import itertools
cases=[]
for state,matchTime,schemeRetreat,schemeTurn,schemeMode,teamControl,deployment,initialDeployment in itertools.product([100,0x65],[-1001,0,1,179001,180000,2147483647],[0,3],[0,45],[0,1,2],[-1,0],[0,1],[0,1]):
 body={key:7 for key in fields};body['matchTime']=matchTime
 initialShared={key:9 for key in shared}
 for key,off in fields.items():write(owner+off,body[key])
 for key,off in shared.items():write(context+off,initialShared[key])
 team=2;selectedWorm=3
 write(owner+0x104,initialDeployment);write(context+0x20,0);write(context+0x14,0)
 write(context+0x11d48,schemeRetreat);write(context+0x11d4c,schemeTurn);write(context+0x11d3f,schemeMode)
 write(registry+team*0x51c-4,selectedWorm);write(registry+team*0x51c+selectedWorm*0x9c-0x594,state)
 write(registry+team*0x51c+4,255);write(registry+team*0x51c-0x18,321)
 write(registry+4,88);write(registry+8,99);write(context+team*3000+0x3cd0,teamControl)
 calls.clear();sp=stack+0xf000;write(sp,stop);write(sp+4,team);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 try: cpu.emu_start(0x4b3210,stop+1,count=2000)
 except Exception:
  print(hex(cpu.reg_read(UC_X86_REG_EIP)), calls, state, matchTime);raise
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('turn start did not exit')
 result={'body':{k:signed(read(owner+off)) for k,off in fields.items()},'shared':{k:signed(read(context+off)) for k,off in shared.items()},'teamFlags':read(registry+team*0x51c+4),'cachedTeams':read(registry+4),'cachedHealth':read(registry+8),'calls':list(calls)}
 cases.append({'input':dict(body=body,shared=initialShared,state=state,schemeRetreat=schemeRetreat,schemeTurn=schemeTurn,schemeMode=schemeMode,teamControl=teamControl,deployment=deployment,initialDeployment=initialDeployment,team=team,selectedWorm=selectedWorm,teamFlags=255,teamHealth=321,positionX=123<<16,positionY=-25<<16),'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B3210 with original registry getters/setters/cache invalidation and panel target. Optional external controllers absent. Event/worm/wind/text interfaces captured; deployment query explicit.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} turn-start transitions')
