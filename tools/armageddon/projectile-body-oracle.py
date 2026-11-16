"""Execute the numeric projectile-constructor block with accepted placement.

Collision predicates receive fixed-point coordinates and return explicit hit IDs.
No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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

body,context,payload=owner+0x1000,owner+0x2000,owner+0x3000
cpu.mem_map(context+0x10000,0x2000)
terrain,manager,vtable,terrain_event,manager_event,placement=owner+0x4000,owner+0x4100,owner+0x4200,owner+0x4300,owner+0x4400,owner+0x4500
write(context+0x24,terrain);write(context+0x7d4,manager)
write(terrain,vtable);write(manager,vtable)
write(vtable+0xc,placement);write(vtable+0x40,manager_event)
cpu.mem_write(placement,b'\x31\xc0\xc2\x0c\x00');cpu.mem_write(manager_event,b'\xc2\x08\x00')
fields={'mass':0x58,'flags':0x40,'vx':0x9c,'vy':0xa0,'restitutionX':0x78,'restitutionY':0x7c,'tangent':0x80,
'facing':0x3c8,'launchY':0x13c,'drag':0x64,'windScale':0x68,'gravityScale':0x6c,'complex':0x4c,'enabled':0x48,'x':0x90,'y':0x94,'sleeping':0xb8}
cases=[]
for mode in range(6):
    for velocity in [[0,0],[0x90000,-0x30000],[-0x90000,0x30000]]:
        for repeat in [0,1]:
            for friction in [0,77,100,255]:
                for values in [[100,100,100,60,80],[-1,50,200,120,-50],[65535,0,-100,0,100]]:
                    config=dict(zip(['drag','wind','gravity','bounce','friction'],values))
                    config.update({'mode':mode,'flags':0x100,'collisionFlags':0x400000})
                    launch={'x':0x24000,'y':0x74000,'vx':velocity[0],'vy':velocity[1],'repeat':repeat}
                    base_body={'restitutionY':123,'tangent':456}
                    cpu.mem_write(body,b'\x00'*0x400)
                    write(body+0x38,context);cpu.mem_write(context+0x11ba0,bytes([friction]))
                    for offset,value in {0x7c:123,0x80:456,0x3c8:1,0x138:launch['x'],0x13c:launch['y'],0x2d4:config['flags'],0x334:config['collisionFlags'],0x330:mode,0x338:config['bounce'],0x33c:config['friction'],0x304:config['drag'],0x308:config['wind'],0x310:config['gravity']}.items():write(body+offset,value&0xffffffff)
                    for offset,value in {0x10:velocity[0],0x14:velocity[1],0x20:repeat}.items():write(payload+offset,value&0xffffffff)
                    cpu.reg_write(UC_X86_REG_EBX,body);cpu.reg_write(UC_X86_REG_EBP,payload);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                    cpu.emu_start(0x4e1acb,0x4e1cd0,count=10000)
                    if cpu.reg_read(UC_X86_REG_EIP)!=0x4e1cd0:raise RuntimeError('Block did not finish')
                    output={name:struct.unpack('<i',cpu.mem_read(body+offset,4))[0] for name,offset in fields.items()}
                    cases.append({'base':base_body,'config':config,'payload':launch,'frictionByte':friction,'output':output})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004E1ACB..004E1CD0','method':'Numeric constructor block with selected configuration fields, base restitution/tangent sentinels, explicit payload and scheme friction byte. Terrain callback and manager event are stubbed; placement always accepted. Record selection and rejected placement are outside scope.','cases':cases},indent=2)+'\n')
print(f'Captured {len(cases)} projectile body configurations')
