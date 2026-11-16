"""Execute original trigonometry and launch geometry routines in Unicorn.

Trigonometry runs unchanged. Launch position, collision and RNG interfaces
receive explicit fixture inputs. No game entry point runs.
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

def invoke(address,arguments):
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<I',v&0xffffffff) for v in arguments))
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'Did not return {address:x}')
    return cpu.reg_read(UC_X86_REG_EAX)
trig_hash=hashlib.sha256()
for angle in range(65536):
    for address in [0x49bfb0,0x49bff0]: trig_hash.update(struct.pack('<I',invoke(address,[angle])))
root=Path(__file__).resolve().parents[2]
table=list(struct.unpack('<1281i',cpu.mem_read(0x5603a0,1281*4)))
(root/'src/armageddon/trig-table.json').write_text(json.dumps(table)+'\n')
vtable,getpos,collision=owner+0x800,owner+0xa00,owner+0xb00
record,context,terrain,tv=owner+0x1000,owner+0x4000,owner+0x5000,owner+0x6000
write(owner,vtable);write(vtable+0x5c,getpos);write(owner+0x354,record)
write(owner+0x38,context);write(context+0x24,terrain);write(terrain,tv);write(tv+0x28,collision)
cpu.mem_write(getpos,b'\xc2\x08\x00');cpu.mem_write(collision,b'\xc2\x08\x00');cpu.mem_write(0x4ee960,b'\xc3')
queries=[];draws=[]
def observe(cpu,address,size,unused):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==getpos: write(read(sp+4),100<<16);write(read(sp+8),200<<16)
    if address==0x4ee960: draws.append(True);cpu.reg_write(UC_X86_REG_EAX,random_value)
    if address==collision:
        queries.append(list(struct.unpack('<2i',cpu.mem_read(sp+4,8))))
        cpu.reg_write(UC_X86_REG_EAX,int(len(queries)>=block_after))
for address in [getpos,collision,0x4ee960]: cpu.hook_add(UC_HOOK_CODE,observe,begin=address,end=address)
fields=json.loads((root/'src/armageddon/weapon-art-fields.json').read_text())
vectors=[]
for identity,values in fields.items():
    values={**values,'0x7c':123}
    for offset,value in values.items(): write(record+int(offset,16),value&0xffffffff)
    for angle in [0,32768,65535]:
        for facing in [-1,1]:
            for preview in [0,1]:
                for block_after in ([1,4,99] if values['0x68']==1 and values['0x6c']==9 else [99]):
                    for random_value in ([0,65535] if values['0x70']==2 else [0]):
                        queries.clear();draws.clear()
                        write(owner+0x260,angle);write(owner+0x1b0,facing&0xffffffff);write(owner+0x2fc,321)
                        cpu.mem_write(owner+0x7000,struct.pack('<4i',0,0,111,222))
                        invoke(0x4faf90,[owner+0x7000+i*4 for i in range(4)]+[preview])
                        vectors.append({'weapon_id':int(identity),'fields':values,'angle':angle,'facing':facing,'preview':preview,'random':random_value,'block_after':block_after,
                            'result':list(struct.unpack('<4i',cpu.mem_read(owner+0x7000,16))),'queries':list(queries),'rng_draws':len(draws)})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['0049BFB0','0049BFF0','004FAF90'],
    'method':'Original trig routines exhaustively sampled over all 65536 input words. Original launch routine with observed position/collision/RNG interfaces, supplied controlled weapon records, position=(100,200), airstrike target=321 and initial direction=(111,222).',
    'trig_sha256':trig_hash.hexdigest(),'trig_table_address':'005603A0','vectors':vectors},indent=2)+'\n')
print(f'Captured exhaustive trig hash and {len(vectors)} launch cases')
