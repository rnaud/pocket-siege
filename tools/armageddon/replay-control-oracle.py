"""Capture original replay capture, input, and playback request controllers."""
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
registry=context+0x1b94
shared={'replaying':0x1d444,'recording':0x1d43c,'captureRequested':0x1d438,'replayRequested':0x1d440,'stopRequested':0x1d448,'manualReplay':0x12418,'speed':0x1240c,'frame':0x7f0,'captureFrame':0x1d430}
fields={'activeTeam':0x128,'activeWorm':0x12c,'selectedTeam':0x130,'controller':0x284}
keyboard=owner+0x2000;device=owner+0x2200
write(keyboard,keyboard+0x100);write(keyboard+0x104,stop+0x100);write(keyboard+0x10c,stop+0x200)
write(device,device+0x100);write(device+0x108,stop+0x300);write(device+0x12c,stop+0x400)
write(context+4,keyboard)
calls=[];current={}
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  key=read(sp+4);calls.append(['query',key]);ret(int(key in current.get('keys',[])),4)
 elif address==stop+0x200:calls.append(['consume',read(sp+4)]);ret(0,4)
 elif address==stop+0x300:calls.append(['speed',read(sp+4)]);ret(0,4)
 elif address==stop+0x400:calls.append(['stop']);ret()
 elif address==0x4c3100:calls.append(['wormState',read(sp+4),read(sp+8)])
 elif address==0x4c30c0:calls.append(['counterA'])
 elif address==0x4c30e0:calls.append(['counterB'])
 elif address==0x4b39a0:calls.append(['matchEnded']);ret(current['matchEnded'])
cpu.hook_add(UC_HOOK_CODE,hook)
def execute(address,body):
 global current
 current=body;calls.clear()
 for key,offset in shared.items():write(context+offset,body.get(key,0))
 for key,offset in fields.items():write(owner+offset,body.get(key,0))
 write(context+0x20,body.get('externalController',0))
 write(context+0xc,device if body.get('playbackDevice',0) else 0)
 controllers=body.get('controllers',[])
 cpu.mem_write(context+0x1b8aa,struct.pack('<h',len(controllers)))
 for i,value in enumerate(controllers):cpu.mem_write(context+0x1b88a+2*i,struct.pack('<H',value&65535))
 cpu.mem_write(context+0x11d46,bytes([body.get('thresholdA',0)&255]))
 cpu.mem_write(context+0x11d44,struct.pack('<H',body.get('thresholdB',0)&65535))
 write(registry+4,body.get('counterA',0));write(registry+8,body.get('counterB',0))
 write(registry+0x51c+0x9c-0x594,body.get('wormState',0))
 sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(address,stop+1,count=3000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('replay controller did not exit')
 result=dict(body)
 for key,offset in shared.items():
  if key in result:result[key]=signed(read(context+offset))
 return {'input':body,'result':{'state':result,'calls':list(calls)}}
capture=[]
for replaying,recording,requested,activeTeam,weaponState in itertools.product([0,1],[0,1],[0,1],[0,1],range(0x64,0x89)):
 capture.append(execute(0x4b5ef0,dict(replaying=replaying,recording=recording,captureRequested=requested,activeTeam=activeTeam,activeWorm=1,wormState=weaponState)))
inputs=[]
for replaying,recording,controllers,keys,speed,manual,stopped,playbackDevice in itertools.product([0,1],[0,1],[[],[7],[8,7],[65535]], [[],[2],[3],[27],[2,3,27]], [1,4,0],[0,1],[0,1],[0,1]):
 inputs.append(execute(0x4b5f40,dict(replaying=replaying,recording=recording,controllers=controllers,controller=7,keys=keys,speed=speed,manualReplay=manual,stopRequested=stopped,playbackDevice=playbackDevice)))
for controller,controllers in itertools.product([-1,65535,7],[[65535],[7,7],[8,7],[]]):
 inputs.append(execute(0x4b5f40,dict(replaying=1,recording=0,controllers=controllers,controller=controller,keys=[3,27],speed=1,manualReplay=0,stopRequested=0,playbackDevice=1)))
playback=[]
for counterA,counterB,manual,ended,elapsed in itertools.product([-1,0,1,255],[-1,0,1,65535],[0,1],[0,1],[-2147483648,-1,0,1000,1001,2147483647]):
 playback.append(execute(0x4b60b0,dict(externalController=0,replaying=0,recording=1,selectedTeam=1,counterA=counterA,counterB=counterB,thresholdA=1,thresholdB=1,manualReplay=manual,matchEnded=ended,frame=elapsed,captureFrame=0,replayRequested=0)))
for thresholdA,thresholdB,captureFrame,frame in itertools.product([0,255,256],[0,65535,65536],[0,2147483647],[-2147483648,1000,1001]):
 playback.append(execute(0x4b60b0,dict(externalController=0,replaying=0,recording=1,selectedTeam=1,counterA=1,counterB=1,thresholdA=thresholdA,thresholdB=thresholdB,manualReplay=0,matchEnded=0,frame=frame,captureFrame=captureFrame,replayRequested=0)))
for gate in ['externalController','replaying','recording','selectedTeam']:
 body=dict(playback[0]['input']);body[gate]=1 if gate in ['externalController','replaying'] else 0
 playback.append(execute(0x4b60b0,body))
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B5EF0/004B5F40/004B60B0. Original registry getters, worm-state classifier004AAB00, and request helper004EDB40 execute unchanged. Input/playback devices and match-end query are explicit interfaces.','capture':capture,'inputs':inputs,'playback':playback},separators=(',',':'))+'\n')
print(f'Captured {len(capture)} capture, {len(inputs)} input, {len(playback)} playback cases')
