"""Execute original grave constructor instructions in Unicorn.

Original base/grave numeric constructor blocks execute; manager placement returns clear. No game entry point runs.
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



context=0x2300000;cpu.mem_map(context,0x20000)
manager,vtable,place,payload=owner+0x5000,owner+0x6000,owner+0x7000,owner+0x4000
write(context+0x7d4,manager);write(manager,vtable);write(vtable+0xc,place)
cpu.mem_write(place,b'\x31\xc0\xc2\x0c\x00')
fields={'enabled':0x48,'complex':0x4c,'suspended':0x54,'mass':0x58,'radius':0x5c,'waterDrag':0x60,'drag':0x64,'windScale':0x68,'gravityScale':0x6c,'restitutionX':0x78,'restitutionY':0x7c,'tangent':0x80,'x':0x90,'y':0x94,'angle':0x98,'vx':0x9c,'vy':0xa0,'angularVelocity':0xa4,'skimScale':0xb4,'sleeping':0xb8,'submerged':0xbc,'contact':0xc0,'moving':0xc4,'flags':0x40}
cases=[]
for friction in [0,50,96,100,255]:
 write(owner+0x38,context);cpu.mem_write(context+0x11ba0,bytes([friction]))
 esp=stack+0xf000;write(esp+0x18,13);write(esp+0x1c,2)
 cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,0);cpu.reg_write(UC_X86_REG_ESP,esp)
 cpu.emu_start(0x4f4021,0x4f414d,count=1000)
 write(payload,100*65536);write(payload+4,200*65536);write(esp+0x1c,payload)
 cpu.reg_write(UC_X86_REG_ESP,esp)
 cpu.emu_start(0x4d5282,0x4d52f8,count=1000)
 if cpu.reg_read(UC_X86_REG_EIP)!=0x4d52f8:raise RuntimeError('Constructor block did not finish')
 output={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
 cases.append(dict(friction=friction,x=100*65536,y=200*65536,body=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,blocks=['004F4021–004F414D','004D5282–004D52F8'],method='Numeric constructor instructions unchanged; task registry excluded, placement manager returns clear.',cases=cases),indent=2)+'\n')
print(f'Captured {len(cases)} constructor cases')
