"""Run Landgen's original object occupancy/placement-mask routines.

Only allocation is stubbed. Native image size/pixel methods, orientation,
mask generation and row-copy helper run unchanged. No game entry point runs.
"""
import argparse, base64, hashlib, json, struct
from pathlib import Path
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_EIP, UC_X86_REG_ESP
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('exe',type=Path);p.add_argument('inputs',type=Path);p.add_argument('output',type=Path)
a=p.parse_args();data=a.exe.read_bytes();digest=hashlib.sha256(data).hexdigest()
if digest!='dd6b6820436132d8e9cf06de47a4d29a3e93ba813768e0c7b25606c40832194c':p.error('Unexpected Landgen executable')
pe=struct.unpack_from('<I',data,60)[0];optional=pe+24
base=struct.unpack_from('<I',data,optional+28)[0];size=struct.unpack_from('<I',data,optional+56)[0]
cpu=Uc(UC_ARCH_X86,UC_MODE_32);cpu.mem_map(base,(size+4095)&~4095)
cpu.mem_write(base,data[:struct.unpack_from('<I',data,optional+60)[0]])
headers=optional+struct.unpack_from('<H',data,pe+20)[0]
for i in range(struct.unpack_from('<H',data,pe+6)[0]):
 _,rva,n,offset=struct.unpack_from('<IIII',data,headers+i*40+8)
 if n:cpu.mem_write(base+rva,data[offset:offset+n])
owner=0x2000000;image=owner+0x1000;pixels=owner+0x10000;stack=0x2400000;stop=stack+0x10000;heap=stack+0x20000
cpu.mem_map(owner,0x400000);cpu.mem_map(stack,0x100000)
def write(addr,value):cpu.mem_write(addr,struct.pack('<I',value&0xffffffff))
def read(addr):return struct.unpack('<I',cpu.mem_read(addr,4))[0]
next_alloc=heap
def hook(cpu,address,size,user):
 global next_alloc
 if address==0x40b540:
  sp=cpu.reg_read(UC_X86_REG_ESP);n=read(sp+8)
  if n>0x10000:raise ValueError('Unexpected allocation')
  cpu.mem_write(next_alloc,bytes(n));cpu.reg_write(UC_X86_REG_EAX,next_alloc)
  next_alloc+=(n+15)&~15;cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x40b540,end=0x40b540)
results=[]
for case in json.loads(a.inputs.read_text()):
 cpu.mem_write(owner,bytes(0x2000));next_alloc=heap
 width,height=case['width'],case['height'];cpu.mem_write(pixels,base64.b64decode(case['pixels']))
 write(owner+0x18,case['direction']);write(owner+0x2c,image);write(image,0x414018)
 for offset,value in [(8,pixels),(0x10,width),(0x14,width),(0x18,height),(0x24,width),(0x28,height)]:write(image+offset,value)
 for entry in [0x405720,0x4058d0]:
  sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(entry,stop,count=100000000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Native routine did not return')
 n=read(owner+0x1c)*read(owner+0x20)
 result={k:v for k,v in case.items() if k!='pixels' or not case['asset']}
 result['occupancy']=bytes(cpu.mem_read(read(owner+0x24),n)).decode('ascii')
 result['placement']=bytes(cpu.mem_read(read(owner+0x28),n)).decode('ascii')
 world=owner+0x3000;board=owner+0x4000;board_pixels=owner+0x6000
 bw,bh=read(owner+0x1c)+2,read(owner+0x20)+2
 write(world+0x28,board);write(board,0x414018)
 for offset,value in [(8,board_pixels),(0x10,bw),(0x14,bw),(0x18,bh),(0x1c,0),(0x20,0),(0x24,bw),(0x28,bh)]:write(board+offset,value)
 result['fits']=[]
 for mode in [0,1,2,3,128,'matching']:
  cells=bytearray(bw*bh)
  if mode=='matching':
   for y in range(bh-2):
    for x in range(bw-2):cells[(y+1)*bw+x+1]=int(result['placement'][y*(bw-2)+x])
  else:cells[:]=bytes([mode])*len(cells)
  cpu.mem_write(board_pixels,bytes(cells));sp=stack+0xf000
  for off,value in [(0,stop),(4,owner),(8,1),(12,1)]:write(sp+off,value)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,world)
  cpu.emu_start(0x408ce0,stop,count=100000000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Native fit did not return')
  result['fits'].append(bool(cpu.reg_read(UC_X86_REG_EAX)))
 results.append(result)
a.output.write_text(json.dumps({'executable_sha256':digest,'routines':['00405720','004058D0','00405840','00402EE0','004032A0','00408CE0'],'cases':results},indent=2)+'\n')
print(len(results),'native terrain-mask cases')
