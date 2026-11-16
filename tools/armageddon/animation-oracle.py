"""Execute original sprite sampling, metadata and animation timing routines."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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
def invoke(address, arguments):
    cpu.mem_write(stack+0xff00,struct.pack('<I',stop)+b''.join(struct.pack('<I',value&0xffffffff) for value in arguments))
    cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(address,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop: raise RuntimeError(f'Instruction limit: {address:08x}')
    return cpu.reg_read(UC_X86_REG_EAX)

samples=[]
for count in [1,2,20,32]:
    for flags in range(4):
        cpu.mem_write(owner,bytes(0x100))
        cpu.mem_write(owner+0x68,struct.pack('<4H',flags,count,60,60))
        write(owner+0x70,owner+0x1000)
        for index in range(count):
            cpu.mem_write(owner+0x1000+index*12,struct.pack('<4hI',0,0,1,1,index))
        for progress in [-131073,-65536,-1,0,1,2048,32767,32768,65534,65535,65536,65537,131071,2147483647]:
            frame=invoke(0x4b0260,[progress]+[owner+0x3000+i*4 for i in range(6)])
            samples.append({'count':count,'flags':flags,'progress':progress,'frame':frame})

metadata=[]
root=Path(__file__).resolve().parents[2]/'public/armageddon/sprites'
for name in ['wbrth1','wblink1','wwalk','wjump','wfall','wland1','wfly1','wdie','wwinner','wbaz','wthrgrn','wminlnk','wicelk3','wicelk2','wicestnd']:
    sprite=(root/(name+'.spr')).read_bytes()
    p=12+struct.unpack_from('<H',sprite,10)[0]*3
    blocks=struct.unpack_from('<H',sprite,p)[0]
    p=((p+5)&~3)+blocks*12
    rate,flags,width,height,count=struct.unpack_from('<I4H',sprite,p)
    cpu.mem_write(owner,bytes(0x100))
    write(owner+4,rate);write(owner+0x14,1)
    cpu.mem_write(owner+0xc,struct.pack('<2H',flags,count))
    invoke(0x4afc10,[owner+0x3000,owner+0x3004,owner+0x3008])
    metadata.append({'name':name,'rate':rate,'flags':flags,'count':count,
      'result':{'rate':read(owner+0x3000),'loop':read(owner+0x3004),'span':read(owner+0x3008)}})

cases=[]
# [sprite ID, normalized progress, fixed-point fps, loop, cycle frame count]
for name,current,queued,read_index in [
    ('breathing',[35,0,25<<16,1,39],[],0),
    ('freeze-entry',[572,0,35<<16,0,20],[[584,0,25<<16,0,1]],0),
    ('controlled-to-timed',[443,32768,0,0,32],[[35,0,25<<16,1,39]],15),
    ('loop-boundary',[35,65000,25<<16,1,39],[[35,0,25<<16,1,39]],14),
    ('already-finished',[572,65536,35<<16,0,20],[[584,0,25<<16,0,1]],0),
    ('three-items',[1,65000,25<<16,0,1],[[2,0,25<<16,0,1],[3,0,25<<16,0,1],[4,0,25<<16,1,3]],15),
    ('negative-rate',[1,100,-25<<16,1,20],[[2,0,25<<16,0,1]],0),
    ('empty',[0,0,0,0,0],[],0),
]:
    cpu.mem_write(owner,bytes(0x400))
    identity,progress,rate,loop,span=current
    cpu.mem_write(owner+8,struct.pack('<5i',identity,progress,rate,loop,span))
    write(owner+0x20,read_index);write(owner+0x1c,(read_index+len(queued))&15)
    for index,item in enumerate(queued):
        identity,progress,rate,loop,span=item
        cpu.mem_write(owner+0x24+((read_index+index)&15)*20,struct.pack('<5i',progress,identity,rate,loop,span))
    snapshots=[]
    for tick in range(1,121):
        invoke(0x4fd3b0,[0x51e])
        if tick in [1,2,10,20,29,30,40,60,120]:
            state=list(struct.unpack('<7i',cpu.mem_read(owner+8,28)))
            snapshots.append({'tick':tick,'state':state})
    cases.append({'name':name,'current':current,'queued':queued,'read_index':read_index,'snapshots':snapshots})
# Exercise the real enqueue routine through the original resource metadata lookup.
provider = owner+0x4000
write(provider,0x526468)
for identity in range(1,21):
    resource=owner+0x8000+identity*32
    write(provider+0x2864+identity*4,resource)
    write(resource+4,0 if identity==20 else 25<<16)
    cpu.mem_write(resource+0xc,struct.pack('<2H',0,32 if identity==20 else 5))
    write(resource+0x14,1)
cpu.mem_write(owner,bytes(0x400))
write(owner,0x527670);write(owner+4,provider)
operations=[]
for identity in range(1,19):
    invoke(0x4fd4b0,[identity,123])
    operations.append({'action':'enqueue','id':identity,'progress':123,
      'metadata':{'rate':25<<16,'loop':0,'span':5},
      'state':list(struct.unpack('<7i',cpu.mem_read(owner+8,28)))})
for unused in range(20):
    invoke(0x4fd3b0,[0x51e])
    operations.append({'action':'advance','state':list(struct.unpack('<7i',cpu.mem_read(owner+8,28)))})
for address,arguments,operation in [
    (0x4fd270,[555],{'action':'setProgress','progress':555}),
    (0x4fd2b0,[],{'action':'clear'}),
    (0x4fd4b0,[20,32768],{'action':'enqueue','id':20,'progress':32768,'metadata':{'rate':0,'loop':0,'span':32}}),
    (0x4fd270,[65535],{'action':'setProgress','progress':65535}),
]:
    invoke(address,arguments)
    operations.append({**operation,'state':list(struct.unpack('<7i',cpu.mem_read(owner+8,28)))})
args.output.parent.mkdir(parents=True,exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256':digest,
  'method':'Original x86 routines executed in Unicorn; real SPR metadata and explicit queue states.',
  'addresses':{'sample':'004B0260','metadata':'004AFC10','advance':'004FD3B0'},
  'operations':operations,'tick':0x51e,'samples':samples,'metadata':metadata,'queues':cases},indent=2)+'\n')
print(f'Captured {len(samples)} frame samples, {len(metadata)} metadata records and {len(cases)} queue traces')
