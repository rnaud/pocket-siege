"""Execute original airborne forces and pixel collision sweep in Unicorn.

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

body,vtable,collision=owner+0x2000,owner+0x800,owner+0xa00
write(owner,vtable);write(vtable+0xc,collision);cpu.mem_write(collision,b'\xc2\x0c\x00')
queries=[];shape='empty'
def solid(x,y):
    x >>= 16;y >>= 16
    return {'empty':False,'right':x>=5,'left':x<0,'floor':y>=5,'ceiling':y<0,'pixel':x==3 and y==3}[shape]
def observe(cpu,address,size,unused):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    x,y=struct.unpack('<2i',cpu.mem_read(sp+8,8))
    queries.append([x,y]);cpu.reg_write(UC_X86_REG_EAX,7 if solid(x,y) else 0)
cpu.hook_add(UC_HOOK_CODE,observe,begin=collision,end=collision)
def run(address,arguments):
    queries.clear()
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<I',v&0xffffffff) for v in arguments))
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=50000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Native routine did not return')
    return cpu.reg_read(UC_X86_REG_EAX)
sweeps=[]
for start in [[0,0],[0x18000,0x24000],[-0x18000,0x1ffff]]:
    for velocity in [[0,0],[123,456],[8<<16,2<<16],[2<<16,8<<16],[-8<<16,2<<16],[2<<16,-8<<16],[-8<<16,-8<<16],[8<<16,8<<16]]:
        for fraction in [0,32768,65536]:
            for shape in ['empty','right','left','floor','ceiling','pixel']:
                for offset,value in zip([0x90,0x94,0x9c,0xa0],start+velocity): write(body+offset,value&0xffffffff)
                write(owner+0x7000,99);write(owner+0x7004,fraction)
                hit=run(0x4c9aa0,[body,owner+0x7000,owner+0x7004])
                sweeps.append({'start':start,'velocity':velocity,'fraction':fraction,'shape':shape,'hit':hit,
                    'position':list(struct.unpack('<2i',cpu.mem_read(body+0x90,8))),'side':read(owner+0x7000),'remaining':read(owner+0x7004),'queries':list(queries)})
forces=[]
for gravity in [-32768,0,32768]:
    for wind in [-4096,0,4096]:
        for velocity in [[0,0],[65536,-32768]]:
            for scale in [0,32768,65536]:
                for drag in [60000,65536]:
                    for shape in ['empty','right','floor','ceiling']:
                        write(owner+0x3b8,gravity&0xffffffff);write(owner+0x3bc,wind&0xffffffff)
                        for offset,value in {0x90:4<<16,0x94:4<<16,0x9c:velocity[0],0xa0:velocity[1],0x64:drag,0x68:scale,0x6c:scale,0xc4:0}.items():write(body+offset,value&0xffffffff)
                        result=run(0x4ca110,[body])
                        forces.append({'gravity':gravity,'wind':wind,'velocity':velocity,'scale':scale,'drag':drag,'shape':shape,
                            'result':result,'velocity_out':list(struct.unpack('<2i',cpu.mem_read(body+0x9c,8))),'moving':read(body+0xc4),'queries':list(queries)})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['004CA110','004C9AA0'],
    'method':'Original forces and sweep run with fixed-point body fields and explicit collision predicates. Hit side starts at sentinel 99; force position=(4,4). Collision returns object ID 7.',
    'sweeps':sweeps,'forces':forces},indent=2)+'\n')
print(f'Captured {len(sweeps)} sweeps and {len(forces)} force cases')
