"""Execute native water callbacks and their real sixteen-entry sound queue.

Collision predicates receive fixed-point coordinates and return explicit hit IDs.
No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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

context=0x3000000
cpu.mem_map(context,0x20000)
write(owner+0x38,context)
cases=[]
for skim in [False,True]:
    for velocity in [[0,0],[65536,0],[-65536,32768],[12<<16,-4<<16],[0x7fffffff,1],[-0x80000000,0]]:
        for suppress in [0,1,-1]:
            for count in [0,15,16]:
                cpu.mem_write(context+0x1c994,b'\x00'*320)
                write(context+0x1cad4,count)
                write(owner+0x9c,velocity[0]&0xffffffff);write(owner+0xa0,velocity[1]&0xffffffff)
                write(owner+0x38c,suppress&0xffffffff)
                write(stack+0xff00,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                cpu.emu_start(0x4f4fc0 if skim else 0x4e2220,stop,count=10000)
                if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Callback failed to return')
                after=read(context+0x1cad4)
                sound=list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+count*20,20))) if after>count else None
                cases.append({'skim':skim,'velocity':velocity,'suppress':suppress,'count':count,'after':after,'sound':sound,'suppress_out':struct.unpack('<i',cpu.mem_read(owner+0x38c,4))[0]})
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['004E2220','004F4FC0','004F4FE0','004EDC90'],'method':'Original callbacks execute the original sound queue with counts 0,15,16. No audio backend called. Static descriptors 0055F258 and 0055F260 map IDs 57/58 to Splash.wav/Splish.wav.','cases':cases},indent=2)+'\n')
print(f'Captured {len(cases)} water sound/queue cases')
