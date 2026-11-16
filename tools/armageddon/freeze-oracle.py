"""Execute original Freeze dispatch and animation-queue instructions in Unicorn.

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
def stop_dispatch(cpu,address,size,unused): cpu.emu_stop()
hook=cpu.hook_add(UC_HOOK_CODE,stop_dispatch,begin=0x4b26a0,end=0x4b26a0)
dispatch=[]
for team in range(6):
    write(owner+0xfc,team)
    cpu.reg_write(UC_X86_REG_EBX,owner)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4fcf8b,0x4fcfad,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4b26a0: raise RuntimeError('Dispatch not observed')
    sp=cpu.reg_read(UC_X86_REG_ESP)
    sender,category,target,event,length,payload=struct.unpack('<6I',cpu.mem_read(sp+4,24))
    assert sender==owner
    dispatch.append({'team':team,'category':category,'target':target,'event':event,
                     'length':length,'payload_team':read(payload)})
cpu.hook_del(hook)
# Original animation queue 004F5C80: animator object at worm+0x350.
animator,vtable,clear,queue=owner+0x800,owner+0x900,owner+0xa00,owner+0xb00
write(owner+0x350,animator);write(animator,vtable)
write(vtable+0x14,clear);write(vtable+0x1c,queue)
cpu.mem_write(clear,b'\xc3');cpu.mem_write(queue,b'\xc2\x04\x00')
calls=[]
def observe(cpu,address,size,unused):
    if address==clear: calls.append({'operation':'clear'})
    if address==queue: calls.append({'operation':'queue','sprite_id':read(cpu.reg_read(UC_X86_REG_ESP)+4)})
hook=cpu.hook_add(UC_HOOK_CODE,observe,begin=clear,end=queue)
animation=[]
for previous in [0,35,443,0x23f,0x248]:
    calls.clear()
    cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,0x65,previous))
    cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4f5c80,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Animation call did not return')
    animation.append({'previous_sprite_id':previous,'calls':list(calls)})
sounds = []
for address in [0x55f0e0,0x55f0e8,0x55f3c0]:
    identity,pointer = struct.unpack('<2I',cpu.mem_read(address,8))
    name=bytes(cpu.mem_read(pointer,64)).split(b'\0')[0].decode('ascii')
    sounds.append({'id':identity,'filename':name.lower()})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,
    'method':'Original x86 instructions executed with Unicorn; scheduler observed, animation queue interface recorded.',
    'dispatch_entry':'004FCF8B','animation_entry':'004F5C80',
    'dispatch':dispatch,'animation':animation,'sound_descriptors':sounds},indent=2)+'\n')
print(f'Captured {len(dispatch)} native team targets and {len(animation)} freeze animation queues')
