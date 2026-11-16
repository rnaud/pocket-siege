"""Execute original weapon preparation entry and tick routines in Unicorn.

The scheduler is observed at its entry, not executed. Animation interface calls
are recorded with their real calling convention. No game entry point runs.
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

animator,vtable,clear,queue,controlled=owner+0x800,owner+0x900,owner+0xa00,owner+0xb00,owner+0xc00
record=owner+0x1000
write(owner+0x350,animator);write(animator,vtable);write(owner+0x354,record)
for offset,address,code in [(0x14,clear,b'\xc3'),(0x1c,queue,b'\xc2\x04\x00'),(0x18,controlled,b'\xc2\x08\x00')]:
    write(vtable+offset,address);cpu.mem_write(address,code)
calls=[]
def observe(cpu,address,size,unused):
    if address==clear: calls.append({'operation':'clear'})
    if address in [queue,controlled]:
        sp=cpu.reg_read(UC_X86_REG_ESP)
        calls.append({'operation':'queue','sprite_id':read(sp+4),'progress':read(sp+8) if address==controlled else 0})
cpu.hook_add(UC_HOOK_CODE,observe,begin=clear,end=controlled)
setprogress,getstate,getphase,transition=owner+0xf00,owner+0x1100,owner+0x1200,owner+0x1300
write(vtable+0x10,setprogress);write(vtable+0xc,getstate)
write(owner,owner+0x3000);write(owner+0x307c,getphase);write(owner+0x3080,transition)
for address,code in [(setprogress,b'\xc2\x04\x00'),(getstate,b'\xc2\x08\x00'),(getphase,b'\xb8\x69\x00\x00\x00\xc3'),(transition,b'\xc2\x04\x00'),
    (0x4edc90,b'\xc2\x14\x00'),(0x4dd5d0,b'\xc2\x10\x00'),
    (0x4edaf0,b'\x8b\x44\x24\x08\x05\xe8\x03\x00\x00\xc2\x08\x00'),
    (0x4faf90,b'\xc2\x14\x00'),(0x4fa840,b'\xc2\x10\x00')]: cpu.mem_write(address,code)
cpu.mem_write(0x4ee960,b'\xc3')
sounds=[];targets=[];released=[]
current_sprite=progress=0
def observe_extra(cpu,address,size,unused):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==0x4ee960: cpu.reg_write(UC_X86_REG_EAX,random_value)
    if address==setprogress: calls.append({'operation':'setProgress','progress':read(sp+4)})
    if address==getstate: write(read(sp+4),current_sprite);write(read(sp+8),progress)
    if address==transition: targets.append(read(sp+4))
    if address in [0x4edc90,0x4dd5d0]: sounds.append(read(sp+4))
    if address==0x4fa840: released.append(True)
for address in [0x4ee960,setprogress,getstate,transition,0x4edc90,0x4dd5d0,0x4fa840]: cpu.hook_add(UC_HOOK_CODE,observe_extra,begin=address,end=address)
fields=json.loads((Path(__file__).resolve().parents[2]/'src/armageddon/weapon-art-fields.json').read_text())
def invoke(address,arguments):
    calls.clear();sounds.clear();targets.clear();released.clear()
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<I',v&0xffffffff) for v in arguments))
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'Did not return {address:x}')
def result(): return {'calls':list(calls),'sounds':list(sounds),'delay':struct.unpack('<i',cpu.mem_read(owner+0x2b8,4))[0],
    'cue':read(owner+0x2cc),'control':read(owner+0x27c),'burst':read(owner+0x2ac),'released':bool(released),'targets':list(targets)}
vectors=[];ticks=[]
selector=json.loads((Path(__file__).resolve().parents[2]/'tests/fixtures/armageddon/weapon-art.json').read_text())
selected={v['weapon_id']:v['animation_id'] for v in selector['vectors']}
for identity,values in fields.items():
    values={**values,'0x78':12345}
    for offset,value in values.items(): write(record+int(offset,16),value&0xffffffff)
    write(owner+0x170,int(identity))
    for previous in [0,selected[int(identity)]]:
        for progress in [0,32768,65535]:
            for random_value in ([0,65536] if values['0x68']==3 else [0]):
                write(owner+0x260,progress);write(owner+0x2cc,0);write(owner+0x27c,7);write(owner+0x2ac,0)
                invoke(0x4f67e0,[0x67,previous])
                vectors.append({'weapon_id':int(identity),'fields':values,'previous_sprite':previous,'progress':progress,'random':random_value,'result':result()})
    for current_sprite in [selected[int(identity)],0x1fd,0x85]:
        for delay in [-1,0,1,20,25]:
            for progress in [0,65535,65536]:
                write(owner+0x2b8,delay&0xffffffff);write(owner+0x2cc,1);write(owner+0x27c,7);write(owner+0x2ac,0)
                invoke(0x4f6b20,[])
                ticks.append({'weapon_id':int(identity),'fields':values,'sprite':current_sprite,'progress':progress,'delay':delay,'result':result()})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,'entries':['004F67E0','004F6B20'],
    'method':'Original preparation routines and weapon selector. Explicit RNG input; voice lookup maps slot to 1000+slot. Audio, launch and animation/state interfaces observed; payload construction stubbed. Initial control=7; entry cue=0, tick cue=1; burst field=12345.',
    'reload_sound':{'descriptor':'0055F2F0','id':read(0x55f2f0),'filename':bytes(cpu.mem_read(read(0x55f2f4),64)).split(b'\0')[0].decode('ascii')},
    'vectors':vectors,'ticks':ticks},indent=2)+'\n')
print(f'Captured {len(vectors)} preparation entries and {len(ticks)} ticks')
