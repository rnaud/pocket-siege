"""Execute original standard sprite renderer through frame preparation, tinting and pixel drawing."""
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
owner,stack,stop=0x2000000,0x2100000,0x2200000
cpu.mem_map(owner,0x20000);cpu.mem_map(stack,0x10000);cpu.mem_map(stop,0x1000)
def write(address,value):cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address):return struct.unpack('<I',cpu.mem_read(address,4))[0]
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x20000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def call(values):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(0x498890,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Renderer did not return')
def hook(cpu,address,size,user):
 global waits
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop+0x100:
  events.append(['wait',cpu.reg_read(UC_X86_REG_ECX),snapshot()]);waits+=1
  if mutate and waits==3:write(owner+0x48,owner+0x4100)
  ret(1 if waits%2 else 0)
 elif address==stop+0x200:
  target,desc=read(sp+4),read(sp+8);events.append(['describe',target,read(desc),snapshot()])
  for offset,value in [(8,14),(12,20),(16,24)]:write(desc+offset,value)
  if mutate:write(owner+0x48,owner+0x4200)
  ret(0,8)
 elif address==stop+0x300:
  target,rect,desc,flags,event=[read(sp+i*4) for i in range(1,6)]
  events.append(['lock',target,rect,read(desc),flags,event,snapshot()]);write(desc+36,owner+0x2000);ret(failed,20)
for a in [stop+0x100,stop+0x200,stop+0x300]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern in [0,165]:
 for locked in [0,1]:
  for mutate in [False,True]:
   for variant in range(16):
    for progress in [0,32768,65535]:
     cpu.mem_write(owner,bytes([pattern])*0x20000)
     for offset,value in [(0,owner+0x4000),(20,-2),(24,1),(28,19),(32,30),(36,12),(40,6),(0x30,3),(0x48,owner+0x4100),(0x454,locked),(0x458,owner+0x1000),(0x460,owner+0x1200),(0x14b2c,0),(0x2864+7*4,owner+0x16000)]:write(owner+offset,value)
     write(owner+0x406c,stop+0x100)
     for target in [owner+0x4100,owner+0x4200]:write(target,owner+0x4300)
     write(owner+0x4358,stop+0x200);write(owner+0x4364,stop+0x300)
     for bitmap,pixels,width,height,pitch,clip in [(owner+0x1000,owner+0x2000,20,14,24,[1,1,19,13]),(owner+0x18000,owner+0x19000,16,12,16,[2,1,14,10]),(owner+0x1200,owner+0x3800,32,16,32,[0,0,32,16])]:
      for offset,value in [(0,0x5249b0),(4,1),(8,pixels),(12,8),(16,pitch),(20,width),(24,height),(28,clip[0]),(32,clip[1]),(36,clip[2]),(40,clip[3])]:write(bitmap+offset,value)
     cpu.mem_write(owner+0x2000,bytes(0 if i%5==0 else (i*13+7)&255 for i in range(1024)))
     cpu.mem_write(owner+0x19000,bytes(0 if i%3==0 else (i*17+3)&255 for i in range(1024)))
     cpu.mem_write(owner+0x4b2c,bytes((s*3+d*5)&255 for d in range(256) for s in range(256)))
     sprite=owner+0x16000
     for offset,value in [(8,32),(10,16),(12,pattern&3),(14,3),(16,0)]:cpu.mem_write(sprite+offset,struct.pack('<H',value))
     for offset,value in [(20,owner+0x17000),(32,owner+0x18000),(40,owner+0x19000)]:write(sprite+offset,value)
     for i,rect in enumerate([[-4,-3,8,5],[2,1,13,8],[1,-2,14,8]]):cpu.mem_write(owner+0x17000+i*12,struct.pack('<I4h',i*160,*rect))
     events=[];waits=0;failed=0
     encoded=7|(0x10000 if variant&1 else 0)|(0x40000 if variant&2 else 0)|(0x1000000 if variant&4 else 0)|(0x4000000 if variant&8 else 0)
     call([4<<16,3<<16,encoded,progress])
     cases.append(dict(pattern=pattern,locked=locked,mutate=mutate,encoded=encoded,progress=progress,events=events,state=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00498890 standard branch',method='Original standard sprite dispatch, uncompressed frame selection/preparation, tint copy/remap, camera anchors, target locking, clipping and indexed drawing execute unchanged. Only renderer wait and DirectDraw description/locking are backend interfaces. Full128KiB memory compared at each callback and return across all tint/blend/tile/flip combinations. Blend lookup is already prepared; compressed cache preparation is independently verified.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'standard sprite draws')
