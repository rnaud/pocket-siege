"""Execute original Landgen palette allocation for every shipped terrain theme.
All image access and placement routines execute unchanged; no hooks/stubs.
"""
import argparse, base64, hashlib, json, struct
from pathlib import Path
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EBP, UC_X86_REG_ESI
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('inputs',type=Path);p.add_argument('exe',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
data=a.exe.read_bytes();digest=hashlib.sha256(data).hexdigest()
if digest!='dd6b6820436132d8e9cf06de47a4d29a3e93ba813768e0c7b25606c40832194c':p.error('Unexpected Landgen executable')
pe=struct.unpack_from('<I',data,60)[0];opt=pe+24
base=struct.unpack_from('<I',data,opt+28)[0];size=struct.unpack_from('<I',data,opt+56)[0]
u=Uc(UC_ARCH_X86,UC_MODE_32);u.mem_map(base,(size+4095)&~4095)
u.mem_write(base,data[:struct.unpack_from('<I',data,opt+60)[0]])
headers=opt+struct.unpack_from('<H',data,pe+20)[0]
for i in range(struct.unpack_from('<H',data,pe+6)[0]):
 _,rva,n,off=struct.unpack_from('<IIII',data,headers+i*40+8)
 if n:u.mem_write(base+rva,data[off:off+n])
owner=0x2000000;image=owner+0x1000;grid=owner+0x2000;pixels=owner+0x10000;cells=owner+0x30000
stack=owner+0xe00000;stop=stack+0x10000;xy=owner+0x3000;points=owner+0x4000
u.mem_map(owner,0x1000000);u.mem_map(0,0x1000)
def put(addr,v):u.mem_write(addr,struct.pack('<I',v&0xffffffff))
def get(addr):return struct.unpack('<i',u.mem_read(addr,4))[0]
def call(entry,args,receiver=owner):
 sp=stack+0xf000
 for i,v in enumerate([stop]+args):put(sp+i*4,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,receiver)
 u.emu_start(entry,stop,count=100000000)
 if u.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Native routine did not return')
 return u.reg_read(UC_X86_REG_EAX)
def setup_image(addr,ptr,w,h,depth=8):
 put(addr,0x414080 if depth==1 else 0x414018)
 pitch=((w+31)//32)*4 if depth==1 else w
 for off,v in [(0xc,depth),(8,ptr),(0x10,pitch),(0x14,w),(0x18,h),(0x1c,0),(0x20,0),(0x24,w),(0x28,h)]:put(addr+off,v)
def short(addr):return struct.unpack('<h',u.mem_read(addr,2))[0]
def reset(first,last):
 u.mem_write(owner,bytes(0xc00));call(0x40b600,[first,last])
def add(rgb):
 u.mem_write(xy,struct.pack('<hhh',*rgb))
 result=call(0x40b760,[xy])
 return result if result<0x80000000 else result-0x100000000
def snapshot():
 used=[short(owner+0x910+i*2) for i in range(short(owner+0x90e))]
 return {'used':used,'free':[short(owner+0x70e+i*2) for i in range(short(owner+0x70c))],
  'colors':[[i,*struct.unpack('<hhh',u.mem_read(owner+0xc+i*6,6))] for i in used],
  'changed':list(u.mem_read(owner+0x60c,256)),'dirty':bool(get(owner+0xb10))}
cases=[]
for source in json.loads(a.inputs.read_text()):
 for bitmap,prefix in [(False,[]),(True,[]),(True,[[0,0,0],[17,23,41],[255,255,255]])]:
  reset(1,255);images={}
  for rgb in prefix:add(rgb)
  names=['soil','grass','bridge-l','bridge','bridge-r'] if bitmap else ['text','soil','grass','bridge-l','bridge','bridge-r']
  for name in names:
   src=source['images'][name];palette=src['palette'];table=[0]
   for i in range(4,len(palette),4):table.append(add(palette[i:i+3])&255)
   pixels=bytes(table[index] for index in base64.b64decode(src['pixels']))
   images[name]={'sourceSha256':src['sha256'],'translation':table,'pixelsHash':hashlib.sha256(pixels).hexdigest()}
   if name=='grass':rimColor=pixels[128] if src['width']>128 else 0
  cases.append({'theme':source['theme'],'bitmap':bitmap,'prefix':prefix,'images':images,'rimColor':rimColor,'palette':snapshot()})
allocations=[]
for first,last in [(1,3),(2,5),(1,255),(255,255)]:
 reset(first,last);values=[[0,0,0],[1,2,3],[0,0,0],[4,5,6],[7,8,9],[10,11,12],[1,2,3]]
 results=[add(rgb) for rgb in values]
 allocations.append({'first':first,'last':last,'values':values,'results':results,'palette':snapshot()})
a.output.write_text(json.dumps({'sha256':digest,'cases':cases,'allocations':allocations},separators=(',',':'))+'\n')
print(f'{len(cases)} theme palettes and {len(allocations)} allocation cases')
