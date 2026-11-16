"""Execute original Landgen fallback placement and three-layer terrain carving.
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
u.mem_map(owner,0x100000);u.mem_map(0,0x1000)
def put(addr,v):u.mem_write(addr,struct.pack('<I',v&0xffffffff))
def get(addr):return struct.unpack('<i',u.mem_read(addr,4))[0]
def call(entry,args,receiver=owner):
 sp=stack+0xf000
 for i,v in enumerate([stop]+args):put(sp+i*4,v)
 u.reg_write(UC_X86_REG_ESP,sp);u.reg_write(UC_X86_REG_ECX,receiver)
 u.emu_start(entry,stop,count=100000000)
 if u.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Native routine did not return')
 return u.reg_read(UC_X86_REG_EAX)
def setup_image(addr,ptr,w,h):
 put(addr,0x414018)
 for off,v in [(0xc,8),(8,ptr),(0x10,w),(0x14,w),(0x18,h),(0x1c,0),(0x20,0),(0x24,w),(0x28,h)]:put(addr+off,v)
color=image;solid=owner+0x5000;back=owner+0x6000;texture=owner+0x7000;platform=owner+0x8000;mask=owner+0x9000;rim=owner+0xa000
cp=pixels;sp=owner+0x60000;bp=owner+0x80000;tp=owner+0xa0000;pp=owner+0xa1000;mp=owner+0xb0000;rp=owner+0xc0000
w,h=320,240
for addr,ptr,iw,ih in [(color,cp,w,h),(solid,sp,w,h),(back,bp,w,h),(texture,tp,129,1),(platform,pp,13,5),(mask,mp,111,111),(rim,rp,111,111)]:setup_image(addr,ptr,iw,ih)
u.mem_write(tp,bytes([17])*129)
platform_pixels=bytes(0 if (x+y)%4==0 else 23+y for y in range(5) for x in range(13));u.mem_write(pp,platform_pixels)
# The shared original circle virtual method writes the exact mask pixels.
circle=get(get(mask)+0x40)
call(circle,[55,55,50,1],mask)
call(circle,[55,55,55,1],rim);call(circle,[55,55,50,0],rim)
masks={'width':111,'height':111,'hole':list(u.mem_read(mp,111*111)),'rim':list(u.mem_read(rp,111*111))}
for off,v in [(0x14,w),(0x18,h),(0x1c,color),(0x20,solid),(0x24,back),(0x34,texture),(0x3c,platform)]:put(owner+off,v)
def reset_layers():
 c=bytes(3+(x+y)%11 for y in range(h) for x in range(w))
 s=bytes(int(y>=90 and (x//17+y//13)%3!=0) for y in range(h) for x in range(w))
 b=bytes(9 if (x+y)%5 else 0 for y in range(h) for x in range(w))
 for ptr,buf in [(cp,c),(sp,s),(bp,b)]:u.mem_write(ptr,buf)
def hashes():return {name:hashlib.sha256(bytes(u.mem_read(ptr,w*h))).hexdigest() for name,ptr in [('color',cp),('solid',sp),('back',bp)]}
carves=[]
for x,y in [(-55,-55),(0,0),(80,70),(290,210)]:
 for edge in [False,True]:
  reset_layers();call(0x409410,[mask,rim if edge else 0,x,y]);carves.append({'x':x,'y':y,'edge':edge,'hashes':hashes()})
cases=[]
for water in [0,30]:
 for seed in [0,1,42,0xffffffff]:
  for limit in [0,1,2,30]:
   for existing in [[],[{'x':0,'y':0}],[{'x':319,'y':239}],[{'x':160,'y':120}],[{'x':0,'y':0},{'x':160,'y':120},{'x':319,'y':239}]]:
    if limit==30 and any(pt['x']==160 for pt in existing):continue # The original retries forever on this fully blocked small map.
    reset_layers();put(owner+8,water);put(owner+0x10,seed);put(xy,-999);put(xy+4,-999)
    for i,pt in enumerate(existing):put(points+i*8,pt['x']);put(points+i*8+4,pt['y'])
    ok=bool(call(0x409560,[points,len(existing),130,limit,xy,xy+4,mask,rim]))
    cases.append({'water':water,'seed':seed,'limit':limit,'existing':existing,'found':ok,'x':get(xy),'y':get(xy+4),'randomState':get(owner+0x10)&0xffffffff,'hashes':hashes()})
a.output.write_text(json.dumps({'sha256':digest,'masks':masks,'carves':carves,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(carves)} carve cases and {len(cases)} complete fallback cases')
