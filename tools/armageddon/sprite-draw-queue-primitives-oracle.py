"""Execute every original draw-queue primitive insertion and the full 004C42D0 flush."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
import random
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('runtime', type=Path)
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

# Map the bundled installation runtime; only its qsort export is reached. The
# new captures were cross-checked against the previously verified CRT fixture.
runtime=args.runtime.read_bytes();runtime_digest=hashlib.sha256(runtime).hexdigest()
if runtime_digest != 'e11e3ede579dddca1f8b7507d51f4ec13bcb419b1ab9b6e993fb7acfe5200553':
    parser.error('Runtime differs from the verified installation MSVCRT')
pe=struct.unpack_from('<I',runtime,60)[0];opt=pe+24
runtime_base=struct.unpack_from('<I',runtime,opt+28)[0]
size=struct.unpack_from('<I',runtime,opt+56)[0]
cpu.mem_map(runtime_base,(size+0xfff)&~0xfff)
cpu.mem_write(runtime_base,runtime[:struct.unpack_from('<I',runtime,opt+60)[0]])
headers=opt+struct.unpack_from('<H',runtime,pe+20)[0]
for i in range(struct.unpack_from('<H',runtime,pe+6)[0]):
 _,rva,size,offset=struct.unpack_from('<IIII',runtime,headers+40*i+8)
 if size:cpu.mem_write(runtime_base+rva,runtime[offset:offset+size])
# Installation MSVCRT qsort is at RVA0x2344A; the verified fixture used0x22F30.
write(0x5178bc,runtime_base+0x2344a)

queue=0x3000000;cpu.mem_map(queue,0x20000)
renderer=owner;vt=owner+0x1000;camera=owner+0x2000
slots={offset:stop+0x100+offset for offset in range(0x30,0x54,4)}
write(renderer,vt)
for offset,address in slots.items():
    # stdcall stubs: pop return and the argument bytes for each vtable slot.
    arguments={0x30:2,0x34:3,0x38:6,0x3c:5,0x40:4,0x44:5,0x48:4,0x4c:8,0x50:4}[offset]
    write(vt+offset,address);cpu.mem_write(address,bytes([0xc2,arguments*4,0]))
def hook(cpu,address,size,user):
    sp=cpu.reg_read(UC_X86_REG_ESP)
    offset=address-(stop+0x100)
    count={0x30:2,0x34:3,0x38:6,0x3c:5,0x40:4,0x44:5,0x48:4,0x4c:8,0x50:4}[offset]
    draws.append([offset]+[signed(read(sp+4+i*4)) for i in range(count)])
cpu.hook_add(UC_HOOK_CODE,hook,begin=stop+0x100,end=stop+0x150)
def call(entry,this,args):
    sp=stack+0xf000;write(sp,stop)
    for i,value in enumerate(args):write(sp+4+i*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,this)
    cpu.emu_start(entry,stop,count=10000000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop

# entry -> (argument names, record length from the first words).
def record_length(pointer):
    kind=read(pointer)
    if kind==0:return 8
    if kind==1:return 10
    if kind==2:return 13
    if kind==3:return 6
    if kind==4:return 9
    if kind==5:return 5
    if kind==6:return 4+read(pointer+8)*3
    if kind==7:return 5+read(pointer+8)*3
    if kind==8:return 7
    if kind==9:return 5
    if kind==10:return 9
    raise RuntimeError(f'unknown record {kind}')
def snapshot():
    count=read(queue+0x10008);records=[]
    for i in range(count):
        pointer=read(queue+0x1000c+i*4);length=record_length(pointer)
        records.append([signed(read(pointer+j*4)) for j in range(length)])
    return dict(available=read(queue+4),records=records)
def reset(remaining):
    cpu.mem_write(queue,bytes(0x20000));write(queue+4,remaining)

rng=random.Random(9182)
points=owner+0x8000
cases=[]
draws=[]
ORDER_CHOICES=[-2147483648,-1,0,0x400,0xc0000,0xd0000,2147483647]
def coordinate():return rng.randint(-0x400000,0x400000)
def depth():return rng.choice([-65536,-32768,0,65536,0x40000,0x80000])
def make_request(kind):
    order=rng.choice(ORDER_CHOICES)
    if kind==0:return dict(kind=0,args=[order,coordinate(),coordinate(),coordinate(),coordinate(),depth(),rng.randint(0,255)])
    if kind==1:return dict(kind=1,args=[order,coordinate(),coordinate()]+[coordinate() for _ in range(6)])
    if kind==2:return dict(kind=2,args=[order,coordinate(),coordinate(),depth(),rng.randint(0,0xffff),rng.randint(-32768,32768),rng.randint(-32768,32768),rng.choice([0,1,19]),rng.choice([0,1,18]),rng.choice([0,1,2,3,7])])
    if kind==3:return dict(kind=3,args=[order,coordinate(),coordinate(),rng.randint(0,0xffff),rng.randint(0,0xffff)])
    if kind==4:
        if rng.randint(0,1):return dict(kind=4,flagged=True,args=[order,coordinate(),coordinate(),depth(),depth(),rng.choice([0,1,2,3]),rng.randint(0,0xffff),rng.randint(0,65535)])
        return dict(kind=4,args=[order,coordinate(),coordinate(),depth(),rng.randint(0,0xffff),rng.randint(0,65535)])
    if kind==6:
        points=[[coordinate(),coordinate(),depth()] for _ in range(rng.randint(2,4))]
        return dict(kind=6,args=[order,rng.choice([0,1,2,3,0xffffffff])],points=points)
    if kind==7:
        points=[[coordinate(),coordinate(),depth()] for _ in range(rng.randint(2,4))]
        return dict(kind=7,args=[order,rng.choice([0,1,2,3,0xffffffff]),rng.choice([0,1,2,3,0xffffffff])],points=points)
    if kind==8:return dict(kind=8,args=[order,coordinate(),coordinate(),depth(),rng.choice([0,1]),rng.randint(0,8)])
    if kind==9:return dict(kind=9,args=[order,coordinate(),depth(),rng.randint(0,0xffff)])
    if kind==10:return dict(kind=10,args=[order,coordinate(),coordinate(),depth(),rng.randint(0,0xffff),rng.randint(0,65535)])
    raise ValueError(kind)
def submit(request):
    kind=request['kind'];args=request['args']
    if kind==0:entry,native=0x4c3e80,args
    elif kind==1:entry,native=0x4c40e0,args
    elif kind==2:entry,native=0x4c4180,args
    elif kind==3:entry,native=0x4c3f20,args
    elif kind==4:
        if request.get('flagged'):entry,native=0x4c4040,args
        else:entry,native=0x4c3fa0,args
    elif kind==6:
        pointer=points;entry,native=0x4c3cc0,[args[0],pointer,len(request['points']),args[1]]
        for i,point in enumerate(request['points']):
            for j,value in enumerate(point):write(pointer+i*12+j*4,value)
    elif kind==7:
        pointer=points;entry,native=0x4c3d60,[args[0],pointer,len(request['points']),args[1],args[2]]
        for i,point in enumerate(request['points']):
            for j,value in enumerate(point):write(pointer+i*12+j*4,value)
    elif kind==8:entry,native=0x4c3e00,args
    elif kind==9:entry,native=0x4c3bc0,args
    elif kind==10:entry,native=0x4c4230,args
    call(entry,queue,native)
def random_view():
    return dict(x=rng.choice([-65537,32768,123456]),y=rng.choice([-32768,65535,234567]),z=rng.choice([-65536,0,65536,0x40000,0x80000]),distance=rng.choice([0x10000,0x40000,0x100000]))
def flush(view):
    for i,key in enumerate(['x','y','z','distance']):write(camera+4+i*4,view[key])
    draws.clear()
    call(0x4c42d0,queue,[renderer,camera])
    return list(draws)
# Each insertion routine is exercised alone with ordinary and truncated coordinates.
for kind in [0,1,2,3,4,4,6,7,8,9,10]:
    for variant in range(6):
        remaining=0x10000;reset(remaining)
        request=make_request(kind);submit(request)
        view=random_view();result=flush(view)
        cases.append(dict(remaining=remaining,requests=[request],view=view,**snapshot(),draws=result))
# Mixed queues exercise every branch together, including equal and signed orders
# and partial pools that reject later insertions.
for variant in range(24):
    remaining=rng.choice([0x10000,0x8000,0x400,0x100]);reset(remaining)
    kinds=[0,1,2,3,4,4,6,7,8,9,10];rng.shuffle(kinds)
    requests=[make_request(kind) for kind in kinds]
    for request in requests:submit(request)
    view=random_view();result=flush(view)
    cases.append(dict(remaining=remaining,requests=requests,view=view,**snapshot(),draws=result))
args.output.write_text(json.dumps(dict(executable_sha256=digest,runtime_sha256=runtime_digest,entry='004C3BC0 / 004C3CC0 / 004C3D60 / 004C3E00 / 004C3E80 / 004C3F20 / 004C3FA0 / 004C4040 / 004C40E0 / 004C4180 / 004C4230 / 004C42D0 / 004C5190',method='Every original primitive insertion executes unchanged, followed by the complete004C42D0 flush through a nine-entry renderer vtable. Bundled installation MSVCRT qsort is used; its ordering was cross-checked against the previously verified CRT fixture. Records, remaining queue bytes and signed callback arguments are captured across depth rejection, camera rounding, equal/signed orders and both mirrored projection branches.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native primitive queue sequences')
