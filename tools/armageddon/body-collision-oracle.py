"""Execute original two-body collision response 004F4990.

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

incoming=owner+0x2000
cases=[]
pairs=[[[0,0],[8<<16,-3<<16]],[[8<<16,3<<16],[0,0]],[[-4<<16,-2<<16],[8<<16,3<<16]],[[0x6665,0],[0x6666,0]],[[0,0],[0x6665,0]],[[0x3333,0x3333],[0x3333,0x3333]]]
for a,b in pairs:
    for masses in [[65536,65536],[32768,131072],[131072,32768],[65536,-65536]]:
        for tangent in [0,0xcccc,65536]:
            for side in [0,1,2,3,4,99]:
                for target,velocity,mass in [(owner,a,masses[0]),(incoming,b,masses[1])]:
                    for offset,value in {0x9c:velocity[0],0xa0:velocity[1],0x58:mass,0x80:tangent}.items():write(target+offset,value&0xffffffff)
                cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,side))
                cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                cpu.emu_start(0x4f4990,stop,count=10000)
                if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Collision routine did not return')
                cases.append({'receiver':{'vx':a[0],'vy':a[1],'mass':masses[0],'tangent':tangent},'incoming':{'vx':b[0],'vy':b[1],'mass':masses[1]},'side':side,
                    'receiver_out':list(struct.unpack('<2i',cpu.mem_read(owner+0x9c,8))),
                    'incoming_out':list(struct.unpack('<2i',cpu.mem_read(incoming+0x9c,8))),'result':cpu.reg_read(UC_X86_REG_EAX)})
# Execute the real worm receiver callback with explicit ordinary-projectile type.
vtable,other_vtable,position,state_getter,type_getter=owner+0x3000,owner+0x3200,owner+0x3400,owner+0x3500,owner+0x3600
write(owner,vtable);write(incoming,other_vtable)
write(vtable+0x7c,state_getter);write(vtable+0x5c,position)
write(other_vtable+0x5c,position);write(other_vtable+0x50,type_getter)
cpu.mem_write(position,b'\x8b\x44\x24\x04\xc7\x00\x00\x00\x00\x00\x8b\x44\x24\x08\xc7\x00\x00\x00\x00\x00\xc2\x08\x00')
cpu.mem_write(state_getter,b'\x8b\x81\x04\x04\x00\x00\xc3')
cpu.mem_write(type_getter,b'\xb8\x0f\x00\x00\x00\xc3')
gates=[]
for state in list(range(0x60,0x90))+[-1,0x100]:
    for side in [1,2,3,4]:
        a={'vx':65536,'vy':-32768,'mass':65536,'tangent':0xf5c2}
        b={'vx':-8<<16,'vy':3<<16,'mass':65536}
        for target,values in [(owner,a),(incoming,b)]:
            for name,offset in [('vx',0x9c),('vy',0xa0),('mass',0x58)]:write(target+offset,values[name]&0xffffffff)
        write(owner+0x80,a['tangent']);write(owner+0x404,state&0xffffffff)
        cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,side))
        cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
        cpu.emu_start(0x4d6ad0,stop,count=10000)
        if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Worm collision gate did not return')
        gates.append({'state':state,'receiver':a,'incoming':b,'side':side,
            'receiver_out':list(struct.unpack('<2i',cpu.mem_read(owner+0x9c,8))),
            'incoming_out':list(struct.unpack('<2i',cpu.mem_read(incoming+0x9c,8))),'result':cpu.reg_read(UC_X86_REG_EAX)})
# Complex terrain response, including the enclosing stop threshold routine.
probe=owner+0x3700
write(vtable+0x100,probe)
cpu.mem_write(probe,b'\xc2\x08\x00')
queries=[]
pattern=[]
def query_hook(cpu,address,size,user):
    if address != probe: return
    sp=cpu.reg_read(UC_X86_REG_ESP)
    queries.append(list(struct.unpack('<2i',cpu.mem_read(sp+4,8))))
    cpu.reg_write(UC_X86_REG_EAX,pattern[len(queries)-1])
cpu.hook_add(UC_HOOK_CODE,query_hook)
complex_cases=[]
for velocity in [[8<<16,-3<<16],[-8<<16,3<<16],[0,0],[0x6665,0],[0x3333,0x3333]]:
    for tangent in [0,0xcccc,65536,-65537,0x7fffffff]:
        for side in [0,1,2,3,4,99]:
            for pattern in [[0,0],[1,0],[0,7]]:
                for entry in [0x4f4700,0x4f4860]:
                    body={'x':0x7fff8000,'y':-0x7fff8000,'vx':velocity[0],'vy':velocity[1], 'tangent':tangent,'restitutionX':0x9999,'restitutionY':0x8000,'complex':1}
                    for name,offset in [('x',0x90),('y',0x94),('vx',0x9c),('vy',0xa0),('tangent',0x80),('restitutionX',0x78),('restitutionY',0x7c),('complex',0x4c)]:write(owner+offset,body[name]&0xffffffff)
                    write(incoming+0x9c,0x3333);write(incoming+0xa0,0)
                    queries=[]
                    cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,side))
                    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                    cpu.emu_start(entry,stop,count=10000)
                    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Complex bounce did not return')
                    complex_cases.append({'body':body,'side':side,'pattern':pattern,'entry':f'{entry:08X}','queries':queries,'body_out':list(struct.unpack('<2i',cpu.mem_read(owner+0x9c,8))),'other_out':list(struct.unpack('<2i',cpu.mem_read(incoming+0x9c,8)))})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F4990','method':'Original routine executes with explicit body velocities, masses, tangential damping and contact sides. No callbacks stubbed for the base routine. Worm gate cases execute 004D6AD0 with explicit state/position/type getters; incoming type is 0x0f and the original momentum routine executes normally.','cases':cases,'worm_projectile_gates':gates,'complex_bounces':complex_cases},indent=2)+'\n')
print(f'Captured {len(cases)} collisions, {len(gates)} gates, {len(complex_cases)} complex bounces')
