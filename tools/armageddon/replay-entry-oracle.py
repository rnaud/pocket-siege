"""Execute original playback entry branch, with snapshot/device/audio interfaces isolated."""
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
device=owner+0x4000;audio=owner+0x5000
write(owner+0x2a0,context);write(context+0x24,device)
write(device,device+0x100);write(device+0x13c,stop+0x40)
write(audio,audio+0x100);write(audio+0x12c,stop+0x50)
calls=[];ready=0;continued=False

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 global continued
 if address==stop:cpu.emu_stop()
 elif address==0x4a325c:
  continued=True;cpu.emu_stop()
 elif address==stop+0x40:calls.append('ready');ret(ready)
 elif address==stop+0x50:calls.append('audio');ret()
 elif address==0x4a1d20:
  calls.append(['restore',signed(read(context+0x1d434))]);write(context+0x7f0,42);ret(0,4)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for fade in [-2147483648,-1,0,1,3931,3932,3933,61603,61604,61605,65535,65536,65537,2147483647]:
 for phase in [-2,-1,0,1,2]:
  for request in [0,1]:
   for ready in [0,1]:
    for sound in [0,1]:
     calls.clear();continued=False
     cpu.mem_write(context+0x1c188,bytes([0xa5])*0x950)
     cpu.mem_write(context+0x1cad8,bytes((i*17+31)&255 for i in range(0x950)))
     for offset,value in [(0x12488,fade),(0x7f0,0x87654321),(0x1d434,99),(0x1d444,0),(0xc,audio if sound else 0)]:write(context+offset,value)
     write(owner+0x270,phase);write(owner+0x26c,request)
     sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4a30a0,stop+1,count=100000)
     if cpu.reg_read(UC_X86_REG_EIP) not in [stop,0x4a325c]:raise RuntimeError('entry did not exit')
     result={'continued':continued,'fields':[signed(read(context+offset)) for offset in [0x12488,0x7f0,0x1d434,0x1d444]],'manager':[signed(read(owner+offset)) for offset in [0x270,0x26c]],'copiedHash':hashlib.sha256(cpu.mem_read(context+0x1c188,0x950)).hexdigest(),'calls':list(calls)}
     cases.append({'fade':fade,'phase':phase,'request':request,'ready':ready,'sound':sound,'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'004A30A0 entry branch with original0049BF90 clamp; stop before ordinary frame processing at004A325C. Snapshot restore is an explicit substituted interface (separately verified), as are device/audio calls. Compare fade boundaries, signed phase, readiness, request, audio, exact sparse copies and call order. Not full frame-loop or composed snapshot verification.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} playback entries')
