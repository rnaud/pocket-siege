"""Execute combined Landgen candidate placement stages and final point ordering.
All image access and placement routines execute unchanged; no hooks/stubs.
"""
import argparse, hashlib, json, struct
from pathlib import Path
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EBP, UC_X86_REG_ESI
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--packed',action='store_true',help='Use original one-bit collision/backing and masks');p.add_argument('exe',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
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
color=image;solid=owner+0x5000;back=owner+0x6000;texture=owner+0x7000;platform=owner+0x8000;mask=owner+0x9000;rim=owner+0xa000
cp=owner+0x100000;sp=owner+0x300000;bp=owner+0x500000;tp=owner+0xa0000;pp=owner+0xa1000;mp=owner+0xb0000;rp=owner+0xc0000
w,h=1920,696
for addr,ptr,iw,ih in [(color,cp,w,h),(solid,sp,w,h),(back,bp,w,h),(texture,tp,129,1),(platform,pp,13,5),(mask,mp,111,111),(rim,rp,111,111)]:setup_image(addr,ptr,iw,ih,1 if a.packed and addr in [solid,back,mask,rim] else 8)
u.mem_write(tp,bytes([17])*129)
platform_pixels=bytes(0 if (x+y)%4==0 else 23+y for y in range(5) for x in range(13));u.mem_write(pp,platform_pixels)
# The shared original circle virtual method writes the exact mask pixels.
circle=get(get(mask)+0x40)
call(circle,[55,55,50,1],mask)
call(circle,[55,55,55,1],rim);call(circle,[55,55,50,0],rim)
def image_bytes(addr):
 width,height,depth,pitch,ptr=[get(addr+off) for off in [0x14,0x18,0xc,0x10,8]]
 raw=bytes(u.mem_read(ptr,pitch*height))
 if depth==8:return raw
 return bytes((raw[y*pitch+(x>>3)]>>(x&7))&1 for y in range(height) for x in range(width))
def set_image(addr,values):
 width,height,depth,pitch,ptr=[get(addr+off) for off in [0x14,0x18,0xc,0x10,8]]
 if depth==8:u.mem_write(ptr,values);return
 raw=bytearray(pitch*height)
 for y in range(height):
  for x in range(width):
   if values[y*width+x]:raw[y*pitch+(x>>3)]|=1<<(x&7)
 u.mem_write(ptr,bytes(raw))
masks={'width':111,'height':111,'hole':list(image_bytes(mask)),'rim':list(image_bytes(rim))}
for off,v in [(0x14,w),(0x18,h),(0x1c,color),(0x20,solid),(0x24,back),(0x34,texture),(0x3c,platform)]:put(owner+off,v)
def hashes():return {name:hashlib.sha256(image_bytes(addr)).hexdigest() for name,addr in [('color',color),('solid',solid),('back',back)]}
setup_image(grid,cells,w//8,h//8);put(owner+0x28,grid)
cases=[]
for shape in ['flat','empty','solid','islands','terraces']:
 for water in [0,20]:
  for seed in [0,42]:
   for requested in [0,2,4]:
    occupied=bytes(int(y>=300 if shape=='flat' else shape=='solid' if shape in ['solid','empty'] else y%150>=100 if shape=='terraces' else y>=180+(x//120%3)*60 and x%240<160) for y in range(h) for x in range(w))
    for addr,buf in [(color,bytes(7 if v else 0 for v in occupied)),(solid,occupied),(back,bytes(11 if v else 0 for v in occupied))]:set_image(addr,buf)
    put(owner+8,water);put(owner+0x10,seed)
    call(0x408c30,[0,0,w//8,h//8])
    frame=stack+0xe000;count=xy+16;allcount=xy+20;allpoints=owner+0xd0000
    for addr,value in [(frame-0x1c,owner),(frame-0x28,requested),(frame-0x20,mask),(frame-0x10,rim),(frame+0xc,points),(frame+0x10,allcount),(frame+0x14,allpoints),(count,0),(allcount,1),(allpoints,50),(allpoints+4,50)]:put(addr,value)
    u.reg_write(UC_X86_REG_EBP,frame);u.reg_write(UC_X86_REG_ESI,count);u.reg_write(UC_X86_REG_ESP,frame-0x100)
    u.emu_start(0x40988b,0x40997e,count=200000000)
    if u.reg_read(UC_X86_REG_EIP)!=0x40997e:raise RuntimeError(f'Placement did not finish: {shape} {water} {seed} {requested}')
    discovered=[{'x':get(points+i*8),'y':get(points+i*8+4)} for i in range(get(count))]
    allpts=[{'x':get(allpoints+i*8),'y':get(allpoints+i*8+4)} for i in range(get(allcount))]
    call(0x409730,[get(count),points])
    ordered=[{'x':get(points+i*8),'y':get(points+i*8+4)} for i in range(get(count))]
    cases.append({'shape':shape,'water':water,'seed':seed,'requested':requested,'discovered':discovered,'existing':allpts,'ordered':ordered,'randomState':get(owner+0x10)&0xffffffff,'hashes':hashes(),'gridHash':hashlib.sha256(bytes(u.mem_read(cells,w//8*(h//8)))).hexdigest()})
a.output.write_text(json.dumps({'sha256':digest,'packed':a.packed,'masks':masks,'width':w,'height':h,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} complete placement sequences')
