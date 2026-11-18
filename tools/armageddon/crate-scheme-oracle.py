"""Execute original weapon initialization and crate pool construction together."""
import base64,zlib
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
from unicorn.x86_const import UC_X86_REG_EIP, UC_X86_REG_EDI
def invalid(cpu, access, address, size, value, unused):
    print(f'Unmapped memory at {address:08x}, instruction {cpu.reg_read(UC_X86_REG_EIP):08x}')
    return False
cpu.hook_add(UC_HOOK_MEM_INVALID,invalid)
cases=[]
expanded=json.loads(Path('src/armageddon/scheme-runtime-data.json').read_text())
for scheme in expanded['schemes']:
 for flags in range(32):
  scene=dict(specialWeapons=flags&1,tall=(flags>>1)&1,environmentDisabled=(flags>>2)&1,modeByte=(flags>>3)&1,mode=(flags>>4)&1)
  cpu.mem_write(context,bytes(0x20000));cpu.mem_write(context+0x1c,struct.pack('<I',language))
  cpu.mem_write(context+expanded['context_offset'],bytes(scheme['bytes']))
  for key,offset in [('specialWeapons',0x11d57),('environmentDisabled',0x11d62),('modeByte',0x11d68)]:cpu.mem_write(context+offset,bytes([scene[key]]))
  for key,offset in [('tall',0x1b8ac),('mode',0x20)]:cpu.mem_write(context+offset,struct.pack('<i',scene[key]))
  cpu.mem_write(stack+0xff00,struct.pack('<I',stop));cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
  cpu.emu_start(0x4b90a0,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  ammo=list(struct.unpack('<71i',cpu.mem_read(context+0x1bfb8,71*4)))
  cpu.reg_write(UC_X86_REG_ESP,stack+0xff00);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,1)
  cpu.emu_start(0x49db4f,0x49db9a,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==0x49db9a
  count=struct.unpack('<I',cpu.mem_read(context+0x1668,4))[0]
  pool=list(struct.unpack('<'+str(count)+'i',cpu.mem_read(context+0x154c,count*4)))
  cases.append(dict(resource_id=scheme['resource_id'],scene=scene,pool=pool,ammo=ammo))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B90A0 /0049DB4F..0049DB9A',method='Full original weapon initializer followed by original crate pool construction for18 schemes x32 scene mode combinations. Native eligibility executes unchanged. Only localized name getters return explicit empty strings.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'composed crate schemes')
