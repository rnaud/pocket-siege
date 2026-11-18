"""Execute original native sprite canvas rasterization for the browser adapter."""
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
sprite=owner+0x3000;bitmap=owner+0x4000;buffer=owner+0x8000
cpu.mem_map(owner+0x10000,0x30000)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x40000))+bytes(cpu.mem_read(source,len(raw)))+bytes(cpu.mem_read(0x5602e4,16))+bytes(cpu.mem_read(0x7d54e8,8))).hexdigest()
def hook(cpu,address,size,user):
 if address==0x492550:
  sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EAX,bitmap);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x492550,end=0x492550)
root=Path(__file__).resolve().parents[2];cases=[]
for path in ['public/armageddon/sprites/phone.spr','public/armageddon/sprites/cdrom.spr']:
 raw=(root/path).read_bytes() if path else bytes.fromhex(next(c['raw'] for c in json.loads((root/'tests/fixtures/armageddon/sprite-memory.json').read_text())['cases'] if not c['path']))
 for pattern in [0]:
  for capacity in [65536]:
   for last in [2,254]:
    cpu.mem_write(owner,bytes([pattern])*0x40000);cpu.mem_write(source,raw)
    cpu.mem_write(0x5602e4,struct.pack('<4I',0xfffffff0,17,0xfffffff0,23));cpu.mem_write(0x7d54e8,struct.pack('<2I',0xfffffff0,123))
    write(0x55e3c4,buffer);write(buffer,0x5266a0);write(buffer+4,owner+0x10000);write(buffer+8,capacity)
    for offset in [12,16,20,24,28]:write(buffer+offset,0)
    for offset,value in [(0,0x5249b0),(4,1),(8,owner+0x20000),(12,8),(16,192),(20,192),(24,192),(28,5),(32,3),(36,187),(40,189)]:write(owner+0x6000+offset,value)
    call(0x4adac0,[1,last],owner);call(0x4af5c0,[0x497b20,0x497ba0],sprite);call(0x4af790,[owner,source,0],sprite)
    mapping=list(cpu.mem_read(read(sprite+44),struct.unpack_from('<H',raw,10)[0]+1));steps=[]
    width,height=struct.unpack('<2H',cpu.mem_read(sprite+8,4))
    for progress in [0,0,1000,32768,65535,0,65535,32768,0]:
     call(0x4afb00,[progress]+[owner+0x5000+i*4 for i in range(6)],sprite);call(0x4afa30,[],sprite)
     frame=read(sprite+52);left,top,right,bottom=struct.unpack('<4h',cpu.mem_read(read(sprite+20)+frame*12+4,8))
     for offset,value in [(16,width),(20,width),(24,height),(28,0),(32,0),(36,width),(40,height)]:write(owner+0x6000+offset,value)
     cpu.mem_write(owner+0x20000,bytes(width*height))
     call(0x4933c0,[left,top,right-left,bottom-top,bitmap,0,0,0,1],owner+0x6000)
     steps.append(dict(frame=frame,pixels=hashlib.sha256(bytes(cpu.mem_read(owner+0x20000,width*height))).hexdigest()))
    cases.append(dict(path=path,sha256=hashlib.sha256(raw).hexdigest(),mapping=mapping,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004AF790/004AFA30/004933C0 canvas raster',method='Original parser, palette allocation, cache preparation and indexed blitter render real compressed frames at their native signed crop origin into a zeroed canvas. Only bitmap allocation is supplied. Complete indexed canvas SHA256 compared; normal and exhausted palettes are captured.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} sprite bitmap/cache sequences')
