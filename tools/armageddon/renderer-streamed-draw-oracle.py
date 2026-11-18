"""Execute original renderer streamed sprite dispatch through frame selection and clipped drawing."""
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
owner, stack, stop, source = 0x2000000, 0x2100000, 0x2200000, 0x2400000
for address,length in [(owner,0x10000),(stack,0x10000),(stop,0x1000),(source,0x400000)]:cpu.mem_map(address,length)
def write(address,value):cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address):return struct.unpack('<I',cpu.mem_read(address,4))[0]
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Parser did not return')
 return cpu.reg_read(UC_X86_REG_EAX)
sprite=owner+0x1000;renderer=owner+0x2000;table=owner+0x3000;target=owner+0x4000;alternate=owner+0x4100;vtable=owner+0x5000
outputs=[owner+0x6000+i*4 for i in range(6)]
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  events.append(['unlock',read(sp+4),read(sp+8),snapshot()])
  if mutate:write(renderer+0x48,alternate);write(renderer+0x454,99)
  ret(0,8)
 elif address==stop+0x200:
  rect=read(sp+20);events.append(['blit',*[read(sp+i*4) for i in range(1,5)],list(struct.unpack('<4i',cpu.mem_read(rect,16))),read(sp+24),snapshot()]);ret(0,24)
for address in [stop+0x100,stop+0x200]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,165]:
 for flags in range(4):
  for progress in [-2147483648,-1,0,32768,65535,65536,2147483647]:
   for locked in [0,1]:
    for mutate in [False,True]:
     cpu.mem_write(owner,bytes([pattern])*0x10000)
     for offset,value in [(104,flags),(106,3),(108,-161 if pattern else 160),(110,-81 if pattern else 80)]:cpu.mem_write(sprite+offset,struct.pack('<h',value))
     write(sprite+112,table)
     for i,rect in enumerate([[-4,-3,12,9],[2,1,14,8],[1,-2,13,10]]):cpu.mem_write(table+i*12,struct.pack('<4hI',*rect,owner+0x7000+i*64))
     for offset,value in [(20,0),(24,0),(28,20),(32,16),(0x48,target),(0x454,locked)]:write(renderer+offset,value)
     write(target,vtable);write(alternate,vtable);write(vtable+0x80,stop+0x100);write(vtable+0x1c,stop+0x200)
     write(renderer+36,-80 if pattern else 80);write(renderer+40,-40 if pattern else 40)
     write(renderer+0x2864+7*4,0);write(renderer+0x38e4+7*4,sprite)
     events=[];encoded=7|(0x10000 if locked else 0)
     call(0x498890,[4<<16,3<<16,encoded,progress],renderer)
     cases.append(dict(dispatch=True,encoded=encoded,pattern=pattern,flags=flags,progress=progress,locked=locked,mutate=mutate,events=events,state=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00498890 streamed branch',method='Original renderer streamed dispatch,frame selection,camera/anchor placement,tiling and clipped surface-copy caller execute unchanged. Full64KiB memory matches at unlock/blit callbacks and on return. Backend unlock may replace the destination surface and lock field.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} streamed frame/surface sequences')
