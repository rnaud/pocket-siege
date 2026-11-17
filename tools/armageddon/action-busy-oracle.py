"""Execute original worm action-busy writer and controller action gate."""
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

registry=context+0x1b94
vtable=owner+0x1000
write(owner,vtable);write(vtable+0x7c,stop+0x100)
write(owner+0xfc,2);write(owner+0x100,3)
slot=registry+2*0x51c+3*0x9c-0x4fc
calls=[];state=0
endpoints=[stop,0x4d82c3,0x4db56f]
def hook(cpu,address,size,user):
 if address in endpoints:cpu.emu_stop();return
 if address==stop+0x100:
  calls.append('state')
  sp=cpu.reg_read(UC_X86_REG_ESP)
  cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EAX,state)
 elif address==0x4eebe0:calls.append('wake')
 elif address==0x4c32e0:calls.append('setActionBusy')
 elif address==0x4c32b0:calls.append('actionBusy')
cpu.hook_add(UC_HOOK_CODE,hook)
writer=[]
for state in list(range(0x60,0x90))+[-1,0,0x7fffffff]:
 for field26c in [0,1,-1]:
  for field2e0 in [0,1,-1]:
   for busy in [0,25]:
    write(owner+0x26c,field26c);write(owner+0x2e0,field2e0);write(context+0x800,busy);write(slot,77)
    calls.clear();cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,vtable);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
    cpu.emu_start(0x4d8260,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4d82c3:raise RuntimeError('writer did not exit')
    writer.append({'input':dict(state=state,field26c=field26c,field2e0=field2e0,busy=busy),'result':dict(actionBusy=read(slot),busy=read(context+0x800),calls=list(calls))})
clear=[]
for row in writer:
 for actionBusy in [0,1,-1]:
  for tickResult in [0,1]:
   body=dict(row['input'],actionBusy=actionBusy,tickResult=tickResult)
   state=body['state']
   write(owner+0x26c,body['field26c']);write(owner+0x2e0,body['field2e0']);write(context+0x800,body['busy']);write(slot,actionBusy)
   calls.clear();cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,vtable);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_EAX,tickResult)
   cpu.emu_start(0x4d9b78,stop,count=1000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4db56f:raise RuntimeError('clear did not exit')
   clear.append({'input':body,'result':dict(actionBusy=signed(read(slot)),busy=read(context+0x800),calls=list(calls))})
import itertools
gate=[]
for schemeFlag,endRequested,retreatPending,retreatRemaining,activeTeam,field160,actionBusy in itertools.product([0,1,255],[0,1],[0,-1],[0,1],[0,2],[0,1],[0,1]):
 body=dict(schemeFlag=schemeFlag,endRequested=endRequested,retreatPending=retreatPending,retreatRemaining=retreatRemaining,activeTeam=activeTeam,field160=field160,actionBusy=actionBusy)
 for off,value in [(0x128,activeTeam),(0x12c,3),(0x14c,endRequested),(0x170,retreatPending),(0x174,retreatRemaining),(0x160,field160)]:write(owner+off,value)
 write(context+0x11d5f,schemeFlag)
 write(registry+activeTeam*0x51c+3*0x9c-0x4fc,actionBusy)
 calls.clear();sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b5d40,stop+1,count=1000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('gate did not exit')
 gate.append({'input':body,'result':dict(allowed=bool(cpu.reg_read(UC_X86_REG_EAX)),calls=list(calls))})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Original004D8260..004D82C3 writer with original registry setter and busy wake; virtual state getter captured. Full004B5D40 gate and original registry getter execute unchanged. Post-tick004D9B78..004DB56F executes unchanged with explicit004DDBD0 result. Unnamed fields retain offsets.','writer':writer,'clear':clear,'gate':gate},separators=(',',':'))+'\n')
print(f'Captured {len(writer)} action-state writes {len(clear)} post-tick clears and {len(gate)} input gates')
