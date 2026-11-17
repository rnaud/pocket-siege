"""Execute composed original offline frame pipeline across consecutive frames."""
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

import itertools
context=0x2300000;cpu.mem_map(context,0x20000)
root=owner+0x1000;environment=owner+0x3000;device=owner+0x4000;audio=owner+0x5000
recordQueue=owner+0x6000;recordRing=owner+0x6100;inputQueue=owner+0x7000;inputRing=owner+0x7100
write(owner+0x2a0,context);write(owner+4,root);write(owner+0x34,recordQueue);write(owner+0x30,inputQueue)
write(context+0x7d4,environment);write(context+0x24,device);write(context+0xc,audio)
write(root,root+0x800);write(root+0x808,stop+0x200);write(root+0x80c,stop+0x230);write(root+0x818,stop+0x210)
write(environment,environment+0x800);write(environment+0x818,stop+0x220)
write(device,device+0x100);write(audio,audio+0x100)
for offset in [0x30,0x34,0x40,0x44,0x48]:write(device+0x100+offset,stop+offset)
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
 elif address in [stop+offset for offset in [0x30,0x34,0x40,0x44,0x48]]:calls.append(['device',address-stop]);ret()
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
cpu.mem_map(0x2400000,0x20000)
sceneFields=[0x7f0,0x7f4,0x800,0x1240c,0x12488,0x1b8ec,0x1d43c,0x1d444,0x1d448,0x1cad4]
managerFields=[0x15c,0x160,0x164,0x168,0x16c,0x210,0x214,0x21c,0x220,0x224,0x22c,0x230,0x244,0x260,0x264,0x26c,0x270,0x280,0x284,0x288,0x28c,0x290,0x294]
cases=[]
for mode,slow,paused,sound,hide in itertools.product(range(3),[0,1],[0,1],[0,1],[0,1]):
 resetRing(recordRing,0x2400000);resetRing(inputRing,0x2410000)
 cpu.mem_write(context,bytes(0x20000));write(context+0x7d4,environment);write(context+0x24,device);write(context+0xc,audio if sound else 0)
 for offset in managerFields:write(owner+offset,0)
 for offset,value in [(0x7f0,99),(0x800,7),(0x1240c,4),(0x1d43c,int(mode==1)),(0x1d444,int(mode==2)),(0x1d448,slow)]:write(context+offset,value)
 for offset,value in [(0x15c,17),(0x160,23),(0x164,1),(0x168,101),(0x214,3),(0x21c,19),(0x224,hide),(0x244,paused),(0x260,3),(0x284,1)]:write(owner+offset,value)
 queue=recordQueue if mode==2 else inputQueue
 for event,payload in [[0x401,[1,2]],[0x3ea,[]],[0x402,[3]],[0x3ea,[]]]:enqueue(queue,event,payload)
 frames=[]
 for frame in range(3):
  calls.clear();invoke(0x4a30a0,owner)
  frames.append({'calls':list(calls),'scene':[signed(read(context+offset)) for offset in sceneFields],'manager':[signed(read(owner+offset)) for offset in managerFields],'input':events(inputRing),'recorded':events(recordRing)})
 cases.append({'mode':mode,'slow':slow,'paused':paused,'sound':sound,'hide':hide,'frames':frames})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Composed full004A30A0 offline frame with original004A1700 collection,004A1A00 dispatch,004A1E10 session completion,0049E580/0049E750 state advance,004A33F0 audio and ring helpers.48 scenarios each run3 consecutive frames. Only task/environment, device, rendering and audio virtual interfaces substituted. Capture and restore requests inactive; those paths separately verified, not composed here.','sceneFields':sceneFields,'managerFields':managerFields,'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} three-frame pipelines')
