"""Execute full004E5A50 worm selection reset including native ownership release."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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

context=0x2300000;cpu.mem_map(context,0x20000);keyboard=owner+0x1000;vtable=keyboard+0x100;write(keyboard,vtable);write(vtable+8,stop+0x100)
interfaces=[(stop+0x100,1),(0x4b26a0,6),(0x4edc90,5),(0x4e54d0,1)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:calls.append(['repeat',read(sp+4)])
 elif address==0x4b26a0:calls.append(['send']+[signed(sp+4+i*4) for i in range(1,6)])
 elif address==0x4edc90:calls.append(['sound']+[signed(sp+4+i*4) for i in range(5)])
 elif address==0x4e54d0:calls.append(['default',signed(sp+4)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
offsets=[0x4c,0x108,0x8c,0x90,0x94,0x98,0x9c,0xa0,0xa4,0xa8,0xac,0xbc,0xe8,0xf8];cases=[]
for active in [0,1]:
 for next_worm in [3,4,-1]:
  for controller in [-1,8]:
   for keys in [[],[8],[7,8]]:
    for owners in [[],[9],[7,9],[9,7]]:
     cpu.mem_write(owner,bytes(0x200));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context);write(context+4,keyboard)
     fields={**{o:123 for o in offsets},0x3c:2,0x4c:3,0x40:active,0xf0:controller,0xe8:9}
     for o,v in fields.items():write(owner+o,v&0xffffffff)
     for start,count,values in [(0x1b778,0x1b798,[11]),(0x1b7ba,0x1b7da,owners),(0x1b88a,0x1b8aa,keys)]:
      cpu.mem_write(context+count,struct.pack('<h',len(values)))
      for i,v in enumerate(values):cpu.mem_write(context+start+2*i,struct.pack('<h',v))
     for i in range(len(owners)):cpu.mem_write(context+0x1b79a+2*i,struct.pack('<h',4-i))
     initial=list(cpu.mem_read(context+0x1b778,0x134));calls=[]
     sp=stack+0xf000;write(sp,stop);write(sp+4,next_worm&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
     cpu.emu_start(0x4e5a50,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
     cases.append(dict(fields={str(k):v for k,v in fields.items()},next=next_worm,initial=initial,calls=calls,body=[signed(owner+o) for o in offsets],ownership=list(cpu.mem_read(context+0x1b778,0x134))))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E5A50',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} worm-selection cases')
