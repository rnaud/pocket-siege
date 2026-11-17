"""Execute original offline replay frame orchestration with internal interfaces isolated."""
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

context=0x2300000
cpu.mem_map(context,0x20000)
root=owner+0x1000;incoming=owner+0x2000;recording=owner+0x3000
write(owner+0x2a0,context);write(owner+4,root);write(owner+0x30,incoming);write(owner+0x34,recording)
write(root,root+0x100);write(root+0x108,stop+0x40);write(root+0x10c,stop+0x50)
calls=[];limit=0;dispatchCount=0;answer=0

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 global dispatchCount
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop:cpu.emu_stop()
 elif address in [0x4a33f0,0x49e580,0x49e750,0x49fc60]:
  calls.append({0x4a33f0:'audio',0x49e580:'advanceInput',0x49e750:'advancePlayback',0x49fc60:'render'}[address]);ret()
 elif address in [0x4a1700,0x4a1a00]:
  calls.append(['collect' if address==0x4a1700 else 'dispatch', 'incoming' if read(sp+4)==incoming else 'recording'])
  if address==0x4a1a00:
   dispatchCount+=1;write(context+0x1d448,int(dispatchCount<limit))
  ret(0,4)
 elif address==stop+0x40:
  calls.append(['root',read(sp+8),read(sp+12),read(sp+16)]);ret(0,16)
 elif address==stop+0x50:
  calls.append(['query',read(sp+4),read(sp+8)]);write(read(sp+12)+4,answer);ret(1 if answer==0 else 0,12)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for mask in range(64):
 for limit in [0,1,2,50,51,52]:
  calls.clear();dispatchCount=0;answer=-7 if mask&16 else 0
  for offset,value in [(0x12488,0),(0x1d444,mask&1),(0x1d448,0),(0xc,owner+0x4000 if mask&2 else 0),(0x20,0),(0x1b8ec,0x7fffffff)]:write(context+offset,value)
  for offset,value in [(0x270,0),(0x26c,0),(0x244,mask&4),(0x224,mask&8),(0x280,9 if mask&32 else 0),(0x288,88),(0x28c,99),(0x294,77)]:write(owner+offset,value)
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x4a30a0,stop+1,count=100000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('frame did not exit')
  result={'fields':[signed(read(context+offset)) for offset in [0x1b8ec,0x1d448]],'manager':[signed(read(owner+offset)) for offset in [0x280,0x288,0x28c,0x294]],'calls':list(calls)}
  cases.append({'mask':mask,'limit':limit,'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004A30A0 offline ordinary-frame branch with entry fade inactive. Internal004A33F0 audio,004A1700 input collection,004A1A00 event dispatch,0049E580/0049E750 frame advancement,0049FC60 rendering and root virtual calls substituted to isolate orchestration.384 cases cover playback/input, pause, audio, render suppression, acceleration limits and output-buffer status independent of virtual return value. Not internal helper or live integration verification.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} offline frames')
