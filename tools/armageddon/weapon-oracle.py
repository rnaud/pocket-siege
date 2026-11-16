"""Execute WA 3.0.0.0 weapon initialization in isolated x86 emulation.

Requires Unicorn 2.1.4. No entry point, imports or host callbacks are executed.
Usage: python weapon-oracle.py WA.EXE output.json
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_MEM_INVALID, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_ESI

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    parser.error('Executable differs from verified WA 3.0.0.0')
u16 = lambda offset: struct.unpack_from('<H', data, offset)[0]
u32 = lambda offset: struct.unpack_from('<I', data, offset)[0]
pe = u32(0x3c)
base, image_size = u32(pe + 52), u32(pe + 80)
sections = pe + 24 + u16(pe + 20)
cpu = Uc(UC_ARCH_X86, UC_MODE_32)
cpu.mem_map(base, (image_size + 4095) & ~4095)
for i in range(u16(pe + 6)):
    section = sections + i * 40
    address, size, offset = u32(section + 12), u32(section + 16), u32(section + 20)
    cpu.mem_write(base + address, data[offset:offset + size])
owner, context, stack, stop = 0x2000000, 0x2100000, 0x2200000, 0x2300000
for address, size in [(owner,4096),(context,0x20000),(stack,0x10000),(stop,4096)]:
    cpu.mem_map(address,size)
cpu.mem_write(owner + 0x2a0, struct.pack('<I',context))
cpu.mem_write(context + 0x11d57,b'\x01')
for offset in (0x11c98,0x11cde):
    cpu.mem_write(context + offset,b'\x64') # Explicit nonzero percentage divisors.
# The only virtual calls in this initializer are localized display-name getters.
# Substitute empty strings explicitly; they do not feed numeric configuration.
# This is a controlled input, not recovered localization or a patched initializer.
language, vtable, getter, empty = owner + 0x400, owner + 0x500, owner + 0xa00, owner + 0xb00
cpu.mem_write(context + 0x1c,struct.pack('<I',language))
cpu.mem_write(language,struct.pack('<I',vtable))
cpu.mem_write(vtable,struct.pack('<I',getter)*256)
cpu.mem_write(getter,b'\xb8'+struct.pack('<I',empty)+b'\xc3')
cpu.mem_write(stack + 0xff00,struct.pack('<I',stop))
cpu.reg_write(UC_X86_REG_ECX,owner)
cpu.reg_write(UC_X86_REG_ESP,stack + 0xff00)
from unicorn.x86_const import UC_X86_REG_EIP
def invalid(cpu, access, address, size, value, unused):
    print(f'Unmapped memory at {address:08x}, instruction {cpu.reg_read(UC_X86_REG_EIP):08x}')
    return False
cpu.hook_add(UC_HOOK_MEM_INVALID,invalid)
try:
    cpu.emu_start(0x4b90a0,stop,count=2000000)
except Exception:
    print(f'Execution stopped at {cpu.reg_read(UC_X86_REG_EIP):08x}')
    raise
if cpu.reg_read(UC_X86_REG_EIP) != stop:
    raise RuntimeError('Initializer exceeded instruction limit')
result = bytes(cpu.mem_read(context,0x20000))
records = []
for index in range(71):
    start = 0x125bc + index * 0x208
    record = result[start:start + 0x208]
    records.append({'index':index,
                    'name':record[4:37].split(b'\0')[0].decode('ascii'),
                    'alternate_name':record[37:70].split(b'\0')[0].decode('ascii'),
                    'fields':{hex(offset):struct.unpack_from('<i',record,offset)[0]
                              for offset in range(0x48,0x208,4)}})
# The original selector consumes weapon type/action/sprite fields, not localized names.
weapon_art = []
for record in records:
    pointer = context + 0x125bc + record['index'] * 0x208
    cpu.mem_write(owner + 0x354,struct.pack('<I',pointer))
    cpu.mem_write(stack + 0xff00,struct.pack('<2I',stop,pointer))
    cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4fa490,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Weapon animation selector instruction limit')
    weapon_art.append({'weapon_id':record['index'],
      'fields':{key:record['fields'][key] for key in ['0x68','0x6c','0x70','0x74','0x98']},
      'animation_id':cpu.reg_read(UC_X86_REG_EAX)})
inventory = []
def invoke(address, arguments):
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<i',v) for v in arguments))
    cpu.reg_write(UC_X86_REG_ECX,context)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError('Inventory call instruction limit')
    return struct.unpack('<i',struct.pack('<I',cpu.reg_read(UC_X86_REG_EAX)))[0]
cpu.mem_write(context,bytes(0x20000))
slot = context+0x1eb8+11*4
for count in [-2147483648,-2,-1,0,1,9,32767,2147483647]:
    for amount in [-2,-1,0,1,5,2147483647]:
        cpu.mem_write(slot,struct.pack('<i',count))
        invoke(0x4c2fb0,[0,11,amount])
        value=struct.unpack('<i',cpu.mem_read(slot,4))[0]
        inventory.append({'operation':'add','count':count,'amount':amount,'result':value})
    cpu.mem_write(slot,struct.pack('<i',count))
    invoke(0x4c3010,[0,11])
    value=struct.unpack('<i',cpu.mem_read(slot,4))[0]
    inventory.append({'operation':'spend','count':count,'result':value})
    for delay in [-1,0,1,5]:
        for bypass in [0,1]:
            cpu.mem_write(slot,struct.pack('<i',count))
            cpu.mem_write(context+0x1fd4+11*4,struct.pack('<i',delay))
            cpu.mem_write(context+0x2c10,struct.pack('<i',bypass))
            value=invoke(0x4c2ee0,[0,11])
            inventory.append({'operation':'available','count':count,'delay':delay,'bypass':bool(bypass),'result':value})
delay_vectors = []
# Run the original counter block and conditional countdown call. Stop before
# localized notification/audio: only those side effects are outside this test.
def end_countdown(cpu,address,size,unused):
    if address == 0x4e6689: cpu.emu_stop()
hook = cpu.hook_add(UC_HOOK_CODE,end_countdown,begin=0x4e6689,end=0x4e6689)
runtime = context+0x1b94
for previous_turns in [0,1,2,2147483647]:
    for bypass in [False,True]:
        for bank in [0,1]:
            cpu.mem_write(context,bytes(0x20000))
            cpu.mem_write(owner+0x38,struct.pack('<I',context))
            cpu.mem_write(owner+0x3c,struct.pack('<i',bank))
            cpu.mem_write(owner+0x60,struct.pack('<i',previous_turns))
            cpu.mem_write(owner+0xc8,bytes(4))
            cpu.mem_write(runtime+8+bank*0x51c,struct.pack('<i',bank))
            cpu.mem_write(runtime+0x2c10,struct.pack('<i',int(bypass)))
            initial = [-1,0,1,2,5,2147483647]*12
            initial = initial[:71]
            initial[0] = 7 # Reserved slot must not count down.
            offset = runtime+0x1fd4+bank*0x8e*4
            cpu.mem_write(offset,struct.pack('<71i',*initial))
            cpu.reg_write(UC_X86_REG_ESI,owner)
            cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
            cpu.emu_start(0x4e71be,0x4e71df,count=10000)
            if cpu.reg_read(UC_X86_REG_EIP) != 0x4e71df:
                raise RuntimeError('Team counter block instruction limit')
            cpu.emu_start(0x4e721e,0x4e722d,count=100000)
            if cpu.reg_read(UC_X86_REG_EIP) not in (0x4e722d,0x4e6689):
                raise RuntimeError('Delay countdown block instruction limit')
            delay_vectors.append({'previous_turns':previous_turns,'bypass':bypass,'bank':bank,
                'initial':initial,'turns':struct.unpack('<i',cpu.mem_read(owner+0x60,4))[0],
                'delays':list(struct.unpack('<71i',cpu.mem_read(offset,284))),
                'unlocked':bool(struct.unpack('<i',cpu.mem_read(owner+0xc8,4))[0])})
cpu.hook_del(hook)
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,
    'entry':'004B90A0','method':'Original x86 instructions executed with Unicorn',
    'inputs':'Zeroed context except 0x11d57=1 and percentage divisors 0x11c98/0x11cde=100; localized names empty. Not standard-match defaults.',
    'records':records,'weapon_art':weapon_art,'inventory_vectors':inventory,'delay_vectors':delay_vectors},indent=2)+'\n')
print(f'Captured {len(records)} weapon records, {len(inventory)} inventory vectors and {len(delay_vectors)} delay vectors')
