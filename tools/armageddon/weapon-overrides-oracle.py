"""Capture the original weapon override tail after native base-record construction."""
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
from unicorn.x86_const import UC_X86_REG_EIP
def invalid(cpu, access, address, size, value, unused):
    print(f'Unmapped memory at {address:08x}, instruction {cpu.reg_read(UC_X86_REG_EIP):08x}')
    return False
cpu.hook_add(UC_HOOK_MEM_INVALID,invalid)
cases=[]
expanded=json.loads(Path('src/armageddon/scheme-runtime-data.json').read_text())
for scheme in expanded['schemes']:
 cpu.mem_write(context,bytes(0x20000));cpu.mem_write(context+0x1c,struct.pack('<I',language))
 cpu.mem_write(context+expanded['context_offset'],bytes(scheme['bytes']))
 cpu.mem_write(stack+0xff00,struct.pack('<I',stop));cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
 cpu.emu_start(0x4b90a0,0x4bfd60,count=2000000)
 assert cpu.reg_read(UC_X86_REG_EIP)==0x4bfd60
 registers=cpu.context_save();prefix=bytes(cpu.mem_read(context,0x20000));stackBytes=bytes(cpu.mem_read(stack,0x10000))
 for variant in range(9):
  initial=bytearray(prefix)
  # Nonzero six-bank inventory proves mode rejection clears both stocks/delays.
  initial[0x114e4:0x11b98]=bytes((i*13+7)&255 for i in range(0x6b4))
  if variant:
   initial[0x11ba6:0x11d3e]=bytes((i*37+variant*31)&255 for i in range(0x198))
   initial[0x11c98]=[1,2,99,100,127,128,254,255][variant-1]
   initial[0x11cde]=255-initial[0x11c98] or 1
   initial[0x11d57]=variant&1;initial[0x11d62]=(variant>>1)&1;initial[0x11d68]=(variant>>2)&1
   struct.pack_into('<i',initial,0x1b8ac,variant&1);struct.pack_into('<i',initial,0x20,variant&2)
  cpu.context_restore(registers);cpu.mem_write(stack,stackBytes);cpu.mem_write(context,bytes(initial))
  cpu.emu_start(0x4bfd60,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(resource_id=scheme['resource_id'],variant=variant,input=base64.b64encode(zlib.compress(bytes(initial))).decode(),sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004BFD60 through004B90A0 return',method='Original initializer builds prefix records; native override tail and original special/availability routines execute without bypass.18 built-in schemes and eight boundary variants compare entire scene including six nonzero inventory banks. Input buffers are zlib/base64 compressed.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'weapon override sequences')
