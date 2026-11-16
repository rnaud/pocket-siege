"""Execute original teleport animation tick instructions in Unicorn.

Animation interface calls are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
# Tick interfaces observed; body-mode lookup and refresh are stubbed.
bodyvt=owner+0x3000
write(owner,bodyvt)
getmode,setmode,relocate,transition=[owner+n for n in [0xa00,0xb00,0xc00,0xd00]]
for offset,address in [(0x74,getmode),(0x78,setmode),(0x100,relocate),(0x80,transition)]:write(bodyvt+offset,address)
cpu.mem_write(getmode,b'\x31\xc0\xc3')
cpu.mem_write(setmode,b'\xc2\x04\x00')
cpu.mem_write(relocate,b'\xc2\x08\x00')
cpu.mem_write(transition,b'\xc2\x04\x00')
cpu.mem_write(0x4d6760,b'\xc3')
output={}
def observe(cpu,address,size,unused):
 if address==relocate:output['relocate']=True
 if address==transition:output['target']=read(cpu.reg_read(UC_X86_REG_ESP)+4)
cpu.hook_add(UC_HOOK_CODE,observe,begin=relocate,end=transition)
cases=[]
for progress in list(range(0,0x10100,0x28f))+[-2147483648,-1,0x8000-0x28f,0x8000-0x28f+1,0x8000,0x8001,0x10000-0x28f,2147483647]:
 write(owner+0x18c,progress&0xffffffff)
 output={'relocate':False,'target':None}
 write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
 cpu.emu_start(0x4f8030,stop,count=1000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Tick did not return')
 output['progress']=struct.unpack('<i',cpu.mem_read(owner+0x18c,4))[0]
 cases.append({'input':progress,'output':output})
render_cases=[]
for progress in list(range(0,0x10001,655))+[-2147483648,-1,32767,32768,32769,65535,65536,2147483647]:
 write(owner+0x18c,progress&0xffffffff)
 write(owner+0x4000,0x18e)
 cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,owner+0x4000);cpu.reg_write(UC_X86_REG_EBP,owner+0x4004)
 cpu.emu_start(0x4db816,0x4db83f,count=50)
 if cpu.reg_read(UC_X86_REG_EIP)!=0x4db83f:raise RuntimeError('Render block did not finish')
 render_cases.append({'input':progress,'output':struct.unpack('<i',cpu.mem_read(owner+0x4004,4))[0]})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F8030','method':'Original progress and boundary instructions execute unchanged; relocation/state calls observed; body mode and refresh stubbed.','cases':cases,'render_block':'004DB816–004DB83F','render_cases':render_cases},indent=2)+'\n')
print(f'Captured {len(cases)} teleport tick cases')
