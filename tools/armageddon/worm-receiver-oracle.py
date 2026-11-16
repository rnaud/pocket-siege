"""Execute original004D6AD0 receiver for incoming worm(type2), including original004F4990 momentum response. Only state/position/type getters are supplied."""
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
# Execute the real worm receiver callback with explicit incoming worm type2.
vtable,other_vtable,position,state_getter,type_getter=owner+0x3000,owner+0x3200,owner+0x3400,owner+0x3500,owner+0x3600
write(owner,vtable);write(incoming,other_vtable)
write(vtable+0x7c,state_getter);write(vtable+0x5c,position)
write(other_vtable+0x5c,position);write(other_vtable+0x50,type_getter)
cpu.mem_write(position,b'\x8b\x44\x24\x04\xc7\x00\x00\x00\x00\x00\x8b\x44\x24\x08\xc7\x00\x00\x00\x00\x00\xc2\x08\x00')
cpu.mem_write(state_getter,b'\x8b\x81\x04\x04\x00\x00\xc3')
cpu.mem_write(type_getter,b'\xb8\x02\x00\x00\x00\xc3')
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
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D6AD0 incoming type2 worm gate with original004F4990 momentum response. State, position and type getters supplied.',cases=gates),separators=(',',':'))+'\n')
print(f'Captured {len(gates)} worm-to-worm receiver cases')
