"""Execute original Landgen candidate grid, scan, reservation and ordering.
All image access and placement routines execute unchanged; no hooks/stubs.
"""
import argparse, hashlib, json, struct
from pathlib import Path
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EBP, UC_X86_REG_ESI
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('exe',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
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
stack=owner+0x40000;stop=stack+0x10000;xy=owner+0x3000;points=owner+0x4000
u.mem_map(owner,0x100000)
def put(addr,v):u.mem_write(addr,struct.pack('<I',v&0xffffffff))
def get(addr):return struct.unpack('<i',u.mem_read(addr,4))[0]
def call(entry,args):
 sp=stack+0xf000
 for i,v in enumerate([stop]+args):put(sp+i*4,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,owner)
 u.emu_start(entry,stop,count=100000000)
 if u.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Native routine did not return')
 return u.reg_read(UC_X86_REG_EAX)
def setup_image(addr,ptr,w,h):
 put(addr,0x414018)
 for off,v in [(8,ptr),(0x10,w),(0x14,w),(0x18,h),(0x1c,0),(0x20,0),(0x24,w),(0x28,h)]:put(addr+off,v)
cases=[];stages=[]
for shape in ['flat','slope','cave','empty','solid']:
 w,h=320,240
 terrain=bytes(int((y>=175 if shape=='flat' else y>=120+x//4 if shape=='slope' else 55<=y<72 or y>=195 if shape=='cave' else shape=='solid')) for y in range(h) for x in range(w))
 setup_image(image,pixels,w,h);setup_image(grid,cells,w//8,h//8)
 u.mem_write(pixels,terrain)
 for off,v in [(0x14,w),(0x18,h),(0x1c,image),(0x20,image),(0x28,grid)]:put(owner+off,v)
 call(0x408c30,[0,0,w//8,h//8]);initial=list(u.mem_read(cells,w//8*(h//8)))
 for water in [0,30,80]:
  put(owner+8,water)
  for start in [0,239,65535]:
   for attempts in [0,1,12]:
    u.mem_write(cells,bytes(initial));put(xy,start);put(xy+4,-999)
    scans=[]
    for step in range(4):
     found=bool(call(0x4092b0,[attempts,40,40,xy,xy+4]));x,y=get(xy),get(xy+4)
     scans.append({'found':found,'x':x,'y':y})
     if not found:break
     call(0x409220,[x-30,y-30,100,100])
    cases.append({'shape':shape,'water':water,'x':start,'attempts':attempts,'grid':initial,'scans':scans,'reserved':list(u.mem_read(cells,w//8*(h//8)))})
 for water in [0,30]:
  for seed in [0,42,0xffffffff]:
   u.mem_write(cells,bytes(initial));put(owner+8,water);put(owner+0x10,seed)
   frame=stack+0xe000;count=xy+16;allcount=xy+20;allpoints=points+0x1000
   for addr,value in [(frame-0x1c,owner),(frame+0xc,points),(frame+0x10,allcount),(frame+0x14,allpoints),(count,0),(allcount,0)]:put(addr,value)
   u.reg_write(UC_X86_REG_EBP,frame);u.reg_write(UC_X86_REG_ESI,count);u.reg_write(UC_X86_REG_ESP,frame-0x100)
   u.emu_start(0x40988b,0x409914,count=100000000)
   if u.reg_read(UC_X86_REG_EIP)!=0x409914:raise RuntimeError('Candidate stage did not finish')
   pts=[{'x':get(points+i*8),'y':get(points+i*8+4)} for i in range(get(count))]
   assert pts==[{'x':get(allpoints+i*8),'y':get(allpoints+i*8+4)} for i in range(get(allcount))]
   stages.append({'shape':shape,'water':water,'seed':seed,'points':pts,'randomState':get(owner+0x10)&0xffffffff,'reserved':list(u.mem_read(cells,w//8*(h//8)))})
sorts=[]
for xs in [[],[4],[3,1,2],[2,2,2,2],[3,1,3,1,2],[2147483647,-2147483648,0]]:
 inp=[{'x':x,'y':i} for i,x in enumerate(xs)]
 for i,pt in enumerate(inp):put(points+i*8,pt['x']);put(points+i*8+4,pt['y'])
 call(0x409730,[len(inp),points])
 sorts.append({'input':inp,'output':[{'x':get(points+i*8),'y':get(points+i*8+4)} for i in range(len(inp))]})
a.output.write_text(json.dumps({'sha256':digest,'cases':cases,'stages':stages,'sorts':sorts},separators=(',',':'))+'\n')
print(f'{len(cases)} candidate scans and {len(sorts)} order cases')
