"""Execute original replay capture/session tick with native serializers and queue operations."""
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

context=0x2300000;buffer=0x2400000
cpu.mem_map(context,0x20000);cpu.mem_map(buffer,0x10000)
root=owner+0x1000;stream=owner+0x2000;environment=owner+0x3000;device=owner+0x4000;audio=owner+0x5000
recordQueue=owner+0x6000;recordRing=owner+0x6100;playQueue=owner+0x6200;playRing=owner+0x6300
write(owner+0x2a0,context);write(owner+4,root);write(owner+8,stream);write(owner+0x34,recordQueue)
write(context+0x7d4,environment);write(context+0x24,device)
write(root,root+0x800);write(root+0x804,0x4b2d80);write(root+0x2c,6);write(root+0x28,26);write(root+0x24,0);write(root+0x14,2);write(root+0x18,owner+0x9000);write(owner+0x9000,owner+0x7000);write(owner+0x9004,owner+0x8000);write(owner+0x7000,0x527070);write(owner+0x8000,0x5277e0)
write(environment,environment+0x800);write(environment+0x810,0x4c8ee0)
write(stream+4,buffer);write(recordQueue+4,recordRing);write(playQueue+4,playRing)
write(device,device+0x100);write(audio,audio+0x100)
for offset in [0x30,0x34,0x40,0x44,0x48]:write(device+0x100+offset,stop+offset)
write(audio+0x108,stop+0x108)
calls=[];mask=0

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 if address==stop:cpu.emu_stop();return
 if address in [stop+offset for offset in [0x30,0x34,0x40,0x44,0x48]]:
  offset=address-stop;calls.append(['device',offset]);ret({0x30:(mask>>8)&1,0x34:0,0x40:(mask>>7)&1,0x44:(mask>>9)&1,0x48:0xfffffff0}[offset])
 elif address==stop+0x108:
  calls.append(['audio',read(cpu.reg_read(UC_X86_REG_ESP)+4)]);ret(0,4)
cpu.hook_add(UC_HOOK_CODE,hook)
def sha(address,size):return hashlib.sha256(cpu.mem_read(address,size)).hexdigest()
fields=[0x1d438,0x1d43c,0x1d444,0x1d428,0x1d42c,0x1d440]
outputFields=fields+[0x1d448,0x1240c,0x1d430]
cases=[]
for mask in range(1024):
 calls.clear();seed=mask&255
 cpu.mem_write(context+0x7ec,bytes((i*13+seed)&255 for i in range(0x3fbc)))
 cpu.mem_write(context+0x1c188,bytes((i*17+seed)&255 for i in range(0x950)))
 cpu.mem_write(context+0x1cad8,bytes([0xa5])*0x950)
 for i,offset in enumerate(fields):write(context+offset,(mask>>i)&1)
 write(context+0x1d448,7);write(context+0x1240c,1 if mask&32 else 4);write(context+0x1d430,99)
 write(context+0xc,audio if mask&16 else 0);write(context+0x7f0,0x87654321)
 for offset in [0x15c,0x160,0x164,0x26c,0x270]:write(owner+offset,77)
 write(playRing+0x1c,(mask>>6)&1)
 for offset in [0xc,0x10,0x14,0x18,0x1c]:write(recordRing+offset,1)
 write(0x561ec8,1234)
 cpu.mem_write(root+0x3c,bytes((i*11+seed)&255 for i in range(0x5c)))
 cpu.mem_write(root+0xd8,bytes((i*19+seed)&255 for i in range(0x138)))
 cpu.mem_write(environment+0x3b4,bytes((i*7+seed)&255 for i in range(12)))
 cpu.mem_write(buffer,bytes([0xcc])*0x10000);write(stream+0x10,13);write(stream+0xc,21)
 sp=stack+0xf000;write(sp,stop);write(sp+4,playQueue);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4a1e10,stop+1,count=1000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('session tick did not exit')
 result={'fields':[signed(read(context+offset)) for offset in outputFields],'manager':[signed(read(owner+offset)) for offset in [0x15c,0x160,0x164,0x26c,0x270]],'globalCounter':read(0x561ec8),'recordCount':read(recordRing+0x1c),'recordReset':[read(recordRing+offset) for offset in [0xc,0x10,0x14,0x18]],'position':read(stream+0x10),'length':read(stream+0xc),'streamHash':sha(buffer,read(stream+0xc)),'copiedHash':sha(context+0x1cad8,0x950),'calls':list(calls)}
 cases.append({'mask':mask,'result':result})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004A1E10 capture/session tick with native004C7370/004C7480 stream,004C8EE0/004B2D80 serializers with original no-op type13/14 child writers,0049C700/0049C6F0 and ring helpers,004C74F0/004AAA80 checksum. Only device and audio virtual interfaces substituted.1024 flag combinations compare state/call order, snapshot and sparse-copy hashes, ring reset and cursor/length.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} session ticks')
