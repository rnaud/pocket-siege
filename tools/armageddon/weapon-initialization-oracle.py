"""Execute complete004B90A0 with named resources and populated inventory banks."""
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
stubBase=0x2400000;cpu.mem_map(stubBase,0x10000)
for index in range(256):
 cpu.mem_write(vtable+index*4,struct.pack('<I',stubBase+index*16))
 cpu.mem_write(stubBase+index*16,b'\xb8'+struct.pack('<I',stubBase+0x2000+index*64)+b'\xc3')
def nameCall(cpu,address,size,user):
 if (address-stubBase)%16==0:calls.append((address-stubBase)//16*4)
cpu.hook_add(UC_HOOK_CODE,nameCall,begin=stubBase,end=stubBase+0xfff)
cases=[]
expanded=json.loads(Path('src/armageddon/scheme-runtime-data.json').read_text())
for scheme in expanded['schemes']:
 for variant in range(8):
  names=[]
  for index in range(256):
   name=(('Weapon%03d'%index) if variant%2 else ('Alternate%03d'%index)).encode()
   if index%7==0:name=b''
   if index%11==0:name=b'X'*32
   names.append(name.decode());cpu.mem_write(stubBase+0x2000+index*64,name+b'\0')
  initial=bytearray((i*7+3)&255 for i in range(0x20000))
  struct.pack_into('<I',initial,0x1c,language)
  initial[expanded['context_offset']:expanded['context_offset']+0x1e0]=bytes(scheme['bytes'])
  initial[0x114e0]=variant%7;initial[0x11d72]=variant&1
  initial[0x11d57]=variant&1;initial[0x11d61]=(variant>>1)&1;initial[0x11d62]=(variant>>2)&1;initial[0x11d68]=(variant>>1)&1
  struct.pack_into('<i',initial,0x1b8ac,variant&1);struct.pack_into('<i',initial,0x20,variant&2)
  cpu.mem_write(context,bytes(initial));cpu.mem_write(stack+0xff00,struct.pack('<I',stop))
  cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00);calls=[]
  cpu.emu_start(0x4b90a0,stop,count=2000000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  cases.append(dict(resource_id=scheme['resource_id'],variant=variant,input=base64.b64encode(zlib.compress(bytes(initial))).decode(),calls=calls,sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004B90A0',method='Complete original initializer including record copies, localization reads, scheme overrides and mode filtering.18 schemes x8 bank/mode/name variants compare full128KiB scene memory and ordered localized virtual-method calls. Only localized resource strings are host interfaces. Nonzero patterned initial memory verifies preserved bytes.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'complete weapon initializations')
