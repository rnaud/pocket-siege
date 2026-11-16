"""Execute original camera framing, world limits and interpolation routines."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
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

def signed(v):return v if v<0x80000000 else v-0x100000000
def run(address,args):
 sp=stack+0xff00;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+4*i,value&0xffffffff)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(address,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Camera routine did not finish')
def state(values):
 for i,v in enumerate(values):write(owner+4+i*4,v&0xffffffff)
def result():return [signed(read(owner+4+i*4)) for i in range(4)]
cases=[]
for operation,address in [('fit',0x4c58f0),('limit',0x4c5450)]:
 for viewport in [[640,480],[320,240],[1920,696]]:
  for camera in [[0,0,0,65536000],[6553600,13107200,0,65536000],[-32768,6553600,-32768000,65536000],[400*65536+12345,-100*65536-23456,32768000,65536000]]:
   for bounds in [[0,0,100*65536,100*65536],[-1000*65536,-300*65536,1000*65536,700*65536],[500*65536,-208*65536,600*65536,-208*65536],[0,0,1920*65536,696*65536]]:
    if operation=='limit' and bounds[1]==bounds[3]:continue
    for depth in [0,100*65536]:
     state(camera);run(address,viewport+bounds+[depth]);cases.append(dict(operation=operation,camera=camera,viewport=viewport,bounds=bounds,depth=depth,after=result()))
easing=[]
for before in [[0,0,0,65536000],[12345,-23456,34567,65536000],[600*65536,300*65536,-100*65536,65536000]]:
 for target in [[0,0,0],[100*65536+50000,-200*65536+100,300*65536],[-400*65536-1,700*65536+32768,0]]:
  state(before)
  for i,v in enumerate(target):write(owner+0x2004+i*4,v&0xffffffff)
  for tick in range(100):
   current=result();run(0x4c5310,[owner+0x2000]);easing.append(dict(before=current,target=target,after=result(),settled=cpu.reg_read(UC_X86_REG_EAX)))
orchestration=[]
context=0x3000000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
for viewport in [[640,480],[320,650],[1200,650]]:
 for bounds in [[600*65536,-208*65536,600*65536,-208*65536],[200*65536,300*65536,1000*65536,350*65536]]:
  initial=[600*65536,325*65536,0,1000*65536]
  for offset in [0x1c96c,0x1c980]:
   for i,v in enumerate(initial):write(context+offset+4+i*4,v&0xffffffff)
  write(owner+0x98,0);write(context+0x12490,0);write(context+0x12414,14);write(context+0x12410,0)
  limits=[0,-256*65536,1200*65536,650*65536]
  for offset,v in zip([0x1b8cc,0x1b8d4,0x1b8d0,0x1b8d8],limits):write(context+offset,v&0xffffffff)
  write(context+0x1b8dc,viewport[0]);write(context+0x1b8e0,viewport[1])
  for tick in range(60):
   write(context+0x7f0,tick);cpu.mem_write(context+0x124a4,b'\0'*(14*20))
   for i,v in enumerate([1]+bounds):write(context+0x124a4+7*20+i*4,v&0xffffffff)
   before=[[signed(read(context+offset+4+i*4)) for i in range(4)] for offset in [0x1c96c,0x1c980]]
   run(0x4ed710,[])
   after=[[signed(read(context+offset+4+i*4)) for i in range(4)] for offset in [0x1c96c,0x1c980]]
   orchestration.append(dict(viewport=viewport,bounds=bounds,limits=limits,before=before,after=after))
special_cases=[]
for suppression in [-2,-1,0,1,2]:
 for viewport in [[640,480],[320,650],[1200,650]]:
  for requests in [[],[[600*65536,-208*65536]],[[100*65536,200*65536],[900*65536,100*65536]]]:
   initial=[600*65536,325*65536,0,1000*65536]
   for offset in [0x1c96c,0x1c980]:
    for i,v in enumerate(initial):write(context+offset+4+i*4,v&0xffffffff)
   write(owner+0x98,suppression&0xffffffff);write(context+0x12490,0);write(context+0x12414,14);write(context+0x12410,0)
   limits=[0,-256*65536,1200*65536,650*65536]
   for offset,v in zip([0x1b8cc,0x1b8d4,0x1b8d0,0x1b8d8],limits):write(context+offset,v&0xffffffff)
   write(context+0x1b8dc,viewport[0]);write(context+0x1b8e0,viewport[1]);write(context+0x7f0,100)
   cpu.mem_write(context+0x124a4,b'\0'*280)
   bounds=[300*65536,100*65536,400*65536,200*65536]
   for i,v in enumerate([1]+bounds):write(context+0x124a4+7*20+i*4,v&0xffffffff)
   for request in requests:run(0x4eeb70,request)
   special=[signed(read(context+0x12490+i*4)) for i in range(5)]
   run(0x4ed710,[])
   after=[[signed(read(context+offset+4+i*4)) for i in range(4)] for offset in [0x1c96c,0x1c980]]
   special_cases.append(dict(suppression=suppression,viewport=viewport,requests=requests,special=special,bounds=bounds,limits=limits,initial=initial,after=after,outputSuppression=signed(read(owner+0x98)),outputCap=signed(read(context+0x12414)),outputFrame=read(context+0x12410)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004C58F0,004C5450,004C5310 and complete004ED710 task executed unchanged with original fixed arithmetic, projection helpers and priority selector.',cases=cases,easing=easing,orchestration=orchestration,special_cases=special_cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} framing cases, {len(easing)} easing ticks, {len(orchestration)} camera task ticks, {len(special_cases)} override/suppression cases')
