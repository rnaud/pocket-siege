"""Execute native primary/secondary projectile selection and payload overrides.

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

body,payload=owner+0x1000,owner+0x3000
records=json.loads(Path('.local-research/armageddon/oracle/weapons-zero.json').read_text())['records']
sounds=[];events=[]
def capture(cpu,address,size,unused):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==0x4edc90:
        sounds.append(list(struct.unpack('<5i',cpu.mem_read(sp+4,20))))
        count=5
    else:
        pointer=read(sp+24)
        events.append(struct.unpack('<i',cpu.mem_read(pointer,4))[0]);count=6
    cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4)
cpu.hook_add(UC_HOOK_CODE,capture,begin=0x4edc90,end=0x4edc90)
cpu.hook_add(UC_HOOK_CODE,capture,begin=0x4b26a0,end=0x4b26a0)
cases=[]
for record in records:
    block=[record['fields'][hex(offset)] for offset in range(0x74,0x1ec,4)]
    # Explicit nonzero secondary divisor permits all records to exercise the branch.
    block[57]=3
    for repeat in [0,1,2,5,-1]:
        launch={'repeat':repeat,'owner':123 if record['index']%2 else 0,'timer':150,'bounce':60}
        cpu.mem_write(body,b'\x00'*0x400)
        cpu.mem_write(body+0x15c,struct.pack('<94i',*block))
        write(body+0x130,launch['owner'])
        for offset,value in {0x20:repeat,0x24:60,0x28:150}.items():write(payload+offset,value&0xffffffff)
        sounds.clear();events.clear()
        cpu.reg_write(UC_X86_REG_EBX,body);cpu.reg_write(UC_X86_REG_EBP,payload);cpu.reg_write(UC_X86_REG_ESP,stack+0xfe00)
        cpu.emu_start(0x4e1908,0x4e1a18,count=10000)
        if cpu.reg_read(UC_X86_REG_EIP)!=0x4e1a18:raise RuntimeError('Block did not finish')
        words=list(struct.unpack('<42i',cpu.mem_read(body+0x2d4,168)))
        cases.append({'weapon':record['index'],'block':block,'payload':launch,'words':words,'sounds':list(sounds),'ownerEvent':events[0] if events else None,'ownerFlag':read(body+0x3a8)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004E1908..004E1A18','method':'Controlled-input weapon initializer records; secondary sprite count explicitly set to 3. Original block executes both record selections, signed sprite remainder, timer and bounce fallback. Sound and owner-event calls captured without side effects.','cases':cases},indent=2)+'\n')
print(f'Captured {len(cases)} projectile selections')
