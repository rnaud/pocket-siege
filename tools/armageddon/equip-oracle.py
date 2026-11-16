"""Execute original weapon equip transitions in Unicorn.

The scheduler is observed at its entry, not executed. Animation interface calls
are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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

animator,vtable,clear,queue,controlled=owner+0x800,owner+0x900,owner+0xa00,owner+0xb00,owner+0xc00
record=owner+0x1000
write(owner+0x350,animator);write(animator,vtable);write(owner+0x354,record)
for offset,address,code in [(0x14,clear,b'\xc3'),(0x1c,queue,b'\xc2\x04\x00'),(0x18,controlled,b'\xc2\x08\x00')]:
    write(vtable+offset,address);cpu.mem_write(address,code)
# The rope mode lookup is supplied as explicit fixture input; equip code runs unchanged.
cpu.mem_write(0x4edad0,b'\xb8'+struct.pack('<I',owner+0x2000)+b'\xc2\x04\x00')
calls=[]
def observe(cpu,address,size,unused):
    if address==clear: calls.append({'operation':'clear'})
    if address in [queue,controlled]:
        sp=cpu.reg_read(UC_X86_REG_ESP)
        calls.append({'operation':'queue','sprite_id':read(sp+4),'progress':read(sp+8) if address==controlled else 0})
cpu.hook_add(UC_HOOK_CODE,observe,begin=clear,end=controlled)
fields=json.loads((Path(__file__).resolve().parents[2]/'src/armageddon/weapon-art-fields.json').read_text())
vectors=[]
for identity,values in fields.items():
    for offset,value in values.items(): write(record+int(offset,16),value&0xffffffff)
    write(owner+0x170,int(identity))
    for previous in [0x65,0x66,0x6b]:
        for angle in [-32768,0,16384,32768,55705,65535,98304]:
            for rope_mode in ([0,1,2] if int(identity)==37 else [0]):
                calls.clear()
                write(owner+0x260,angle&0xffffffff);write(owner+0x27c,7);write(owner+0x280,9)
                cpu.mem_write(owner+0x2072,bytes([rope_mode]))
                cpu.mem_write(stack+0xff00,struct.pack('<2I',stop,previous))
                cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
                cpu.emu_start(0x4f61e0,stop,count=10000)
                if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Equip did not return')
                vectors.append({'weapon_id':int(identity),'fields':values,'previous_state':previous,
                    'angle':angle,'rope_mode':rope_mode,'calls':list(calls),
                    'result_angle':struct.unpack('<i',cpu.mem_read(owner+0x260,4))[0],
                    'control':read(owner+0x27c)})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004F61E0',
    'method':'Original equip routine and selector executed; animation interface observed, rope mode lookup supplied explicitly. Initial control=7.',
    'vectors':vectors},indent=2)+'\n')
print(f'Captured {len(vectors)} native equip transitions')
