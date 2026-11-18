"""Execute original standalone collision probe004C9650 and bitmap overlap.

No movement actor/cache is supplied; only bitmap storage getters are substituted.
"""
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




fixture=json.loads(Path('tests/fixtures/armageddon/collision-mask.json').read_text())
heap=0x3000000;cpu.mem_map(heap,0x400000)
bitmap_vtable=owner+0x1000;dimensions=owner+0x1100;storage=owner+0x1200
write(bitmap_vtable+0x14,dimensions);write(bitmap_vtable+0x20,storage)
cpu.mem_write(dimensions,b'\xc2\x08\x00');cpu.mem_write(storage,b'\xc2\x0c\x00')
bitmaps={}
def bitmap(width,height,points):
 global heap
 obj=heap;heap+=0x100;address=heap;stride=((width+31)//32)*4;heap+=(stride*height+0xff)&~0xff
 data=bytearray(stride*height)
 for x,y in points:
  off=y*stride+(x//32)*4;word=struct.unpack_from('<I',data,off)[0]|1<<(x%32);struct.pack_into('<I',data,off,word)
 cpu.mem_write(address,bytes(data));write(obj,bitmap_vtable);bitmaps[obj]=(width,height,address,stride)
 return obj
def mask(row,shifted=True):
 global heap
 obj=heap;heap+=0x100;write(obj,0x526920)
 for off,val in [(4,int(shifted)),(12,row['width']),(16,row['height']),(20,row['anchorX']),(24,row['anchorY'])]:write(obj+off,val)
 for i,plane in enumerate(row['planes'] if shifted else row['planes'][:1]):write(obj+28+4*i,bitmap(plane['width'],plane['height'],plane['points']))
 return obj
def observe(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);w,h,data,stride=bitmaps[cpu.reg_read(UC_X86_REG_ECX)]
 values=[w,h] if address==dimensions else [data,1,stride]
 for i,v in enumerate(values):write(read(sp+4+4*i),v)
for address in [dimensions,storage]:cpu.hook_add(UC_HOOK_CODE,observe,begin=address,end=address)
worm=next(r for r in fixture['cases'] if r['shape']==3);worm_object=mask(worm)

manager=owner+0x8000
body_addresses={i:owner+0x3000+i*0x100 for i in range(1,6)}
fields={'flags':0x40,'shape':0x44,'enabled':0x48,'x':0x90,'y':0x94,'overlap':0xec}
cases=[]
for flags in [0,2,4,6,0x80000000,0x80000006]:
 for fraction in [-1,0,1,65535]:
  for enabled in [0,1]:
   initial=[dict(id=i,type=kind,flags=flags if i==1 else 0,shape=3,enabled=1 if i!=3 else enabled,x=x*65536+fraction,y=0,overlap=7) for i,kind,x in [(1,2,0),(2,2,1),(3,1,20),(4,2,20),(5,31,20)]]
   cpu.mem_write(manager,bytes(0x400))
   write(manager+0x3c0,owner+0xa000);write(owner+0xa000+0x3a4+3*4,worm_object)
   registry=[[] for _ in range(32)]
   for b in initial:
    address=body_addresses[b['id']];cpu.mem_write(address,bytes(0x100));write(address+0xf0,worm_object)
    for key,off in fields.items():write(address+off,b[key]&0xffffffff)
    registry[b['type']].append(b['id'])
   # Sparse slots preserve registry order while exercising null-hole skipping.
   registry[2]=[1,0,2,4]
   for kind,ids in enumerate(registry):
    array=owner+0x5000+kind*0x40
    write(manager+0x40+kind*0x1c,len(ids));write(manager+0x44+kind*0x1c,array)
    for i,id in enumerate(ids):write(array+i*4,body_addresses.get(id,0))
   steps=[]
   specs=[
    ({},1,20*65536+fraction,0,flags),
    ({'2':{'x':20*65536}},1,20*65536,0,flags),
    ({'1':{'x':20*65536}},1,0,0,flags),
    ({'1':{'shape':2}},1,20*65536,0,flags),
    ({'1':{'flags':0}},1,20*65536,0,0x80000006),
    ({'1':{'flags':0x80000006,'y':65536}},1,20*65536,0,flags),
    ({},2,0,0,0x80000006),
    ({'1':{'x':0,'y':0,'flags':0x80000006}},1,20*65536,0,0x80000006),
    ({'2':{'enabled':0},'3':{'enabled':0},'4':{'enabled':0}},1,20*65536,0,0x80000006),
    ({'1':{'x':1},'5':{'x':0}},1,20*65536,0,0x80000006),
   ]
   for changes,actor,x,y,query_flags in specs:
    for id,values in changes.items():
     for key,value in values.items():write(body_addresses[int(id)]+fields[key],value&0xffffffff)
    sp=stack+0xf000
    for i,value in enumerate([stop,3,x,y,query_flags]):write(sp+4*i,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ECX,manager);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4c9650,stop,count=100000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Registry query did not return')
    result=cpu.reg_read(UC_X86_REG_EAX)
    steps.append(dict(changes=changes,actor=actor,x=x,y=y,flags=query_flags,result=next((id for id,p in body_addresses.items() if p==result),0),overlaps=[read(body_addresses[i]+0xec) for i in range(1,6)]))
   cases.append(dict(initial=initial,registry=registry,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original standalone shape probe004C9650 and original mask overlap; only bitmap getters supplied. Sparse type registries, zero and high-bit flags, disabled bodies, signed/fractional positions and sequential position changes and unchanged overlap markers.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} registry scenarios / {sum(len(c["steps"]) for c in cases)} sequential queries')
