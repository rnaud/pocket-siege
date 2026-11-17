"""Execute original weapon-completion retreat request and duration selection."""
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

import itertools
fields={'field104':0x104,'activeTeam':0x128,'activeWorm':0x12c,'retreatPending':0x170,'retreatDuration':0x178,'clockTarget':0x190}
record=owner+0x1000
weapon=3
write(record,2);write(record+4,3);write(record+8,weapon)
calls=[]
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 if address==0x4edad0:calls.append('weapon')
 elif address==0x4c2d60:calls.append('wormState')
 elif address==0x4aaab0:calls.append('traversalState')
 elif address==0x4ecfb0:
  calls.append('environmentEvent')
  sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+20)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for endsTurn,field104,schemeFlag,weaponRetreat,oldDuration,activeTeam,wormState,traversalSeconds in itertools.product([0,1],[0,1],[0,1],[-1,0,3000],[0,1000,5000],[0,2],[0x65,0x78,0x7b,0x7c,0x7d,0x79],[0,5,255,256]):
 body=dict(field104=field104,activeTeam=activeTeam,activeWorm=3,retreatPending=0,retreatDuration=oldDuration,clockTarget=65536)
 for key,off in fields.items():write(owner+off,body[key])
 write(context+0x11d62,schemeFlag);write(context+0x11d47,traversalSeconds)
 write(context+0x125bc+weapon*0x208+0x58,endsTurn);write(context+0x125bc+weapon*0x208+0x5c,weaponRetreat)
 write(context+0x1b94+activeTeam*0x51c+3*0x9c-0x594,wormState)
 calls.clear();sp=stack+0xf000
 for i,value in enumerate([stop,owner,0x432,0x124,record]):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b4ce0,stop+1,count=2000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('receiver did not exit')
 after={key:signed(read(owner+off)) for key,off in fields.items()}
 cases.append({'input':dict(body,endsTurn=endsTurn,schemeFlag=schemeFlag,weaponRetreat=weaponRetreat,traversalSeconds=traversalSeconds,wormState=wormState),'result':dict(body=after,calls=list(calls))})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B4CE0 event432 with original004B4230, weapon lookup004EDAD0, registry state getter004C2D60 and classifier004AAAB0. Only environment event receiver captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} weapon-completion transitions')
