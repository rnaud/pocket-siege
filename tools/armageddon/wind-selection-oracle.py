"""Execute original wind selection with original logic RNG and wind getter."""
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

controller=owner+0x2000;write(controller,0x5268b8);write(context+0x7d4,controller)
calls=[];wind=0
def hook(cpu,address,size,user):
 global wind
 if address==stop:cpu.emu_stop();return
 if address==0x4ee960:calls.append('random')
 elif address==0x4c8c70:calls.append('previousWind')
 elif address==0x4b26a0:
  sp=cpu.reg_read(UC_X86_REG_ESP);wind=signed(read(read(sp+24)));calls.append('windEvent')
  cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+28)
cpu.hook_add(UC_HOOK_CODE,hook)
import itertools
cases=[]
for strength,fixed,x,previous,seed in itertools.product([-1,0,50,100,127],[100,-100],[-100<<16,0,960<<16,1920<<16],[0,18724,-18724],[0,42,0xffffffff]):
 cpu.mem_write(context+0x11b9c,bytes([strength&255]));cpu.mem_write(context+0x11b9e,struct.pack('<H',fixed&65535))
 write(controller+0x3bc,previous);write(context+0x1acc,seed);write(context+0x7f0,73)
 calls.clear();sp=stack+0xf000;write(sp,stop);write(sp+4,x);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b3110,stop+1,count=2000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('wind did not exit')
 cases.append({'input':dict(strength=strength,fixed=fixed,x=x,previous=previous,seed=seed,frame=73),'result':dict(wind=wind,randomState=read(context+0x1acc),calls=list(calls))})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B3110 with original004EE960 logic RNG and004C8C70 wind getter. Event43C payload captured.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} wind selections')
