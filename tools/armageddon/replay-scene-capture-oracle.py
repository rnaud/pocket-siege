"""Execute composed capture and playback-request transitions across consecutive frames."""
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

import itertools,base64,zlib
context=0x2300000;cpu.mem_map(context,0x20000)
root=owner+0x1000;environment=owner+0x3000;device=owner+0x4000;audio=owner+0x5000
recordQueue=owner+0x6000;recordRing=owner+0x6100;inputQueue=owner+0x7000;inputRing=owner+0x7100
write(owner+0x2a0,context);write(owner+4,root);write(owner+0x34,recordQueue);write(owner+0x30,inputQueue)
write(context+0x7d4,environment);write(context+0x24,device);write(context+0xc,audio)
write(root,root+0x800);write(root+0x808,stop+0x200);write(root+0x80c,stop+0x230);write(root+0x818,stop+0x210)
write(environment,environment+0x800);write(environment+0x818,stop+0x220)
write(device,device+0x100);write(audio,audio+0x100)
for offset in [0x30,0x34,0x3c,0x40,0x44,0x48]:write(device+0x100+offset,stop+offset)
write(audio+0x11c,stop+0x11c);write(audio+0x108,stop+0x108);write(audio+0x10c,stop+0x10c)
write(recordQueue+4,recordRing);write(inputQueue+4,inputRing)
calls=[]
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x200:
  event,length,pointer=read(sp+8),read(sp+12),read(sp+16)
  
  if event==0x3ec:calls.append(['collect',event,length,read(pointer)==inputQueue])
  else:calls.append(['dispatch',event,list(cpu.mem_read(pointer,length)) if length else []])
  ret(0,16)
 elif address in [stop+0x210,stop+0x220]:calls.append(['flush',address-stop]);ret()
 elif address in [stop+offset for offset in [0x30,0x34,0x3c,0x40,0x44,0x48]]:
  offset=address-stop;calls.append(['device',offset]);ret({0x30:captureAccepted,0x44:playbackAccepted,0x48:0xfffffff0}.get(offset,0))
 elif address==stop+0x230:
  calls.append(['query',read(sp+4),read(sp+8)]);write(read(sp+12)+4,0);ret(0,12)
 elif address==0x49fc60:calls.append(['render']);ret()
 elif address==stop+0x11c:calls.append(['volume',signed(read(sp+4))]);ret(0,4)
 elif address==stop+0x108:calls.append(['speed',read(sp+4)]);ret(0,4)
 elif address==stop+0x10c:calls.append(['sound']+[read(sp+4+i*4) for i in range(5)]);ret(0,20)
cpu.hook_add(UC_HOOK_CODE,hook)
def invoke(address,this,args=[]):
 sp=stack+0xf000;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,this);cpu.emu_start(address,stop+1,count=1000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('dispatcher/helper did not exit')
def resetRing(ring,data):
 cpu.mem_write(ring,bytes(32));write(ring+4,data);write(ring+8,4096);cpu.mem_write(data,bytes(4096))
def enqueue(queue,event,payload):
 cpu.mem_write(owner+0xd000,bytes(payload));invoke(0x49c7f0,queue,[event,len(payload),owner+0xd000])
def events(ring):
 result=[];node=read(ring+0x18)
 while node:
  length=read(node);result.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
 return result
cpu.mem_map(0x2400000,0x30000)
stream=owner+0x2000;streamBuffer=0x2420000
write(stream+8,65536);write(owner+8,stream);write(stream+4,streamBuffer);write(stream+0x14,context)
write(root+0x804,0x4b2d80);write(root+0x2c,6);write(root+0x28,26);write(root+0x24,0)
write(root+0x14,2);write(root+0x18,owner+0x9000);write(owner+0x9000,owner+0xa000);write(owner+0x9004,owner+0xb000);write(owner+0xa000,0x527070);write(owner+0xb000,0x5277e0)
write(environment+0x810,0x4c8ee0)
sceneFields=[0x7f0,0x7f4,0x800,0x1240c,0x12488,0x1b8ec,0x1d430,0x1d434,0x1d438,0x1d43c,0x1d440,0x1d444,0x1d448]
managerFields=[0x15c,0x160,0x164,0x22c,0x230,0x26c,0x270]
cases=[]
for captureAccepted,playbackAccepted,sound,seed in itertools.product([0,1],[0,1],[0,1],[0,37]):
 resetRing(recordRing,0x2400000);resetRing(inputRing,0x2410000)
 cpu.mem_write(context,bytes(0x20000));write(context+0x7d4,environment);write(context+0x24,device);write(context+0xc,audio if sound else 0)
 cpu.mem_write(context+0x7ec,bytes((i*13+seed)&255 for i in range(0x3fbc)))
 cpu.mem_write(context+0x1c188,bytes((i*17+seed)&255 for i in range(0x950)));cpu.mem_write(context+0x1cad8,bytes([0xa5])*0x950)
 cpu.mem_write(root+0x3c,bytes((i*11+seed)&255 for i in range(0x5c)));cpu.mem_write(root+0xd8,bytes((i*19+seed)&255 for i in range(0x138)))
 cpu.mem_write(environment+0x3b4,bytes((i*7+seed)&255 for i in range(12)))
 for offset in [0x15c,0x160,0x164,0x168,0x16c,0x210,0x214,0x21c,0x220,0x224,0x22c,0x230,0x244,0x260,0x264,0x26c,0x270,0x280,0x284,0x288,0x28c,0x290,0x294]:write(owner+offset,0)
 for offset,value in [(0x7f0,99),(0x7f4,0),(0x800,7),(0x1ab8,0),(0x1240c,4),(0x1d438,1),(0x1cad4,0)]:write(context+offset,value)
 write(stream+0x10,13);write(stream+0xc,21);cpu.mem_write(streamBuffer,bytes([0xcc])*0x10000);write(0x561ec8,1234)
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(0x2400000,0x30000))
 frames=[]
 for frame in range(21):
  if frame==2:write(context+0x1d43c,0);write(context+0x1d440,1)
  calls.clear();invoke(0x4a30a0,owner)
  frames.append({'sha256':hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))+bytes(cpu.mem_read(0x2400000,0x30000))).hexdigest(),'calls':list(calls),'scene':[signed(read(context+offset)) for offset in sceneFields],'manager':[signed(read(owner+offset)) for offset in managerFields],'input':events(inputRing),'recorded':events(recordRing),'globalCounter':read(0x561ec8),'position':read(stream+0x10),'length':read(stream+0xc),'streamHash':hashlib.sha256(cpu.mem_read(streamBuffer,read(stream+0xc))).hexdigest(),'copiedHash':hashlib.sha256(cpu.mem_read(context+0x1cad8,0x950)).hexdigest()})
 cases.append({'inputMemory':base64.b64encode(zlib.compress(initial)).decode(),'captureAccepted':captureAccepted,'playbackAccepted':playbackAccepted,'sound':sound,'seed':seed,'frames':frames})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'16 composed004A30A0 sequences of21 frames: full native capture/session, stream/env/root serializers (fresh13/14 no-op children), collection/dispatch, checksums, audio and failed-playback fade. Capture accepted/rejected and playback device accepted/rejected; readiness interface deliberately false, so snapshot reconstruction does not run in this fixture. Only task/device/render/audio interfaces substituted. Compare full384KiB owner/scene/heap memory hashes, snapshot and sparse-copy hashes, queues, fields and calls every frame.','sceneFields':sceneFields,'managerFields':managerFields,'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} capture/request sequences')
