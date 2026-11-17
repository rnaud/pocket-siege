"""Execute native frame-state and audio helpers including original fixed-point arithmetic."""
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
root=owner+0x1000;audio=owner+0x2000;music=owner+0x3000
write(root,root+0x100);write(root+0x108,stop+0x40)
write(audio,audio+0x100);write(audio+0x11c,stop+0x50)
write(music,music+0x100);write(music+0x108,stop+0x60)
calls=[]
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop:cpu.emu_stop()
 elif address==0x49fc60:calls.append('render');ret()
 elif address==stop+0x40:calls.append(['root',read(sp+8),read(sp+12),read(sp+16)]);ret(0,16)
 elif address in [stop+0x50,stop+0x60]:calls.append(['audio' if address==stop+0x50 else 'music',signed(read(sp+4))]);ret(0,4)
cpu.hook_add(UC_HOOK_CODE,hook)
fields=[0x210,0x220,0x260,0x264,0x168,0x16c,0x214,0x21c,0x224,0x244,0x22c,0x230,0x28c]
values=[-2147483648,-65536,-1,0,1,2,4,5,9,10,100,101,32768,65535,65536,65537,2147483647]
state=0x12345678
def random():
 global state
 state=(state*1664525+1013904223)&0xffffffff
 return state
cases=[]
for seed in range(320):
 initial=[values[(seed+i*3)%len(values)] if seed<128 else signed(random()) for i in range(len(fields))]
 # Exercise realistic on/off flags independently of the numeric edge cases.
 for index,bit in [(1,0),(8,1),(9,2)]:initial[index]=(seed>>bit)&1
 if seed<128:initial[2]=[-1,0,1,2,50][seed%5];initial[4]=[100,101,-1,0][seed%4]
 for routine in [0x49e750,0x49e580,0x4a33f0]:
  calls.clear();write(owner+0x2a0,context);write(owner+4,root)
  for offset,value in zip(fields,initial):write(owner+offset,value)
  write(context+0x20,0);write(context+0xc,audio);write(context+0x14,music if seed&8 else 0);cpu.mem_write(context+0x11e45,bytes([seed&255]))
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(routine,stop+1,count=100000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('helper did not exit')
  cases.append({'routine':hex(routine),'initial':initial,'music':bool(seed&8),'volume':seed&255,'result':{'fields':[signed(read(owner+offset)) for offset in fields],'calls':list(calls)}})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full0049E750/0049E580/004A33F0 with original004AE070 fixed multiplication.960 cases include normal flags/thresholds and signed32-bit extremes. Only root virtual event,0049FC60 rendering and audio/music device calls substituted. Offline scene only.','fields':fields,'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} frame-state/audio helpers')
