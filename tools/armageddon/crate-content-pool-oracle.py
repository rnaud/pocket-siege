"""Execute original crate content pool setup and weapon eligibility."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
cases=[]
for specialWeapons in [0,1]:
 for tall in [0,1]:
  for environmentDisabled in [0,1]:
   for modeByte in [0,1]:
    for mode in [0,1]:
     for pattern in [0,1,2]:
      scene=dict(specialWeapons=specialWeapons,tall=tall,environmentDisabled=environmentDisabled,modeByte=modeByte,mode=mode)
      for off,value in [(0x11d57,specialWeapons),(0x11d62,environmentDisabled),(0x11d68,modeByte)]:cpu.mem_write(context+off,bytes([value]))
      write(context+0x20,mode);write(context+0x1b8ac,tall)
      descriptors=[int(pattern==1 or (pattern==2 and slot%3==0)) for slot in range(71)]
      for slot,value in enumerate(descriptors):write(context+0x1260c+slot*0x208,value)
      for count in [0,70,71]:
       initial=list(range(100,100+count));write(context+0x1668,count)
       for i,value in enumerate(initial):write(context+0x154c+i*4,value)
       cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EDI,1)
       cpu.emu_start(0x49db4f,0x49db9a,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==0x49db9a
       output=[read(context+0x154c+i*4) for i in range(read(context+0x1668))]
       cases.append(dict(scene=scene,descriptors=descriptors,initial=initial,output=output))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='0049DB4F..0049DB9A / 004C23E0 / 004AA8F0',method='Original initialization loop, eligibility and special-weapon classifier execute unchanged. Scene flags, weapon descriptors and initial pool supplied directly; no substituted game calls.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native crate pool initializations')
