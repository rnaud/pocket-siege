"""Execute selection countdown text and drawing against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000);language=owner+0x2000;vtable=owner+0x2100;suffix=owner+0x2200
interfaces=[(stop+0x100,0),(stop+0x200,0),(0x4edb70,1),(0x4c67a0,7),(0x4eed30,9)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
write(0x5178f4,stop+0x200)
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def string(a):return bytes(cpu.mem_read(a,128)).split(b'\0')[0].decode()
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:calls.append(['suffix']);cpu.reg_write(UC_X86_REG_EAX,suffix)
 elif address==stop+0x200:
  assert string(read(sp+8))=='%s : %d %s'
  calls.append(['teamName',team]);text=string(read(sp+12))+' : '+str(signed(sp+16))+' '+string(read(sp+20));cpu.mem_write(read(sp+4),text.encode()+b'\0')
 elif address==0x4edb70:
  slot=read(sp+4);calls.append(['palette',slot]);cpu.reg_write(UC_X86_REG_EAX,100+slot)
 elif address==0x4c67a0:
  calls.append(['render',string(read(sp+4)),signed(sp+8),read(sp+12),read(sp+16),read(sp+28)])
  write(read(sp+20),width);write(read(sp+24),height);cpu.reg_write(UC_X86_REG_EAX,1234)
 elif address==0x4eed30:calls.append(['draw']+[signed(sp+4+4*i) for i in range(9)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for remaining in [0,1,999,1000,1001,3000,-1,-1000,2147483647,-2147483648]:
 for tick in [0,24,25,49,50,-1,-25]:
  for viewport in [480,721,-721]:
   cpu.mem_write(owner,bytes(0x3000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
   team=2;priority=2147483647 if tick<0 else 3;width=200;height=17
   for o,v in [(0x3c,team),(0x54,priority),(0x7c,remaining)]:write(owner+o,v&0xffffffff)
   write(context+0x1b8ec,tick&0xffffffff);write(context+0x1b8e0,viewport&0xffffffff)
   write(context+0x1c,language);write(language,vtable);write(vtable+0x54,stop+0x100)
   cpu.mem_write(suffix,b'seconds\0');cpu.mem_write(context+0x3cd6+team*3000,b'Team Two\0')
   calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4e82c0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   cases.append(dict(team=team,priority=priority,remaining=remaining,tick=tick,viewport=viewport,width=width,height=height,calls=calls))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E82C0',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} countdown drawing cases')
