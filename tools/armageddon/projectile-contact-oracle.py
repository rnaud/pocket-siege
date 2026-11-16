"""Execute original004E2240 projectile contact dispatch with captured effect interfaces."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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

other,vtable=owner+0x1000,owner+0x2000
names=['position','velocity','type','enabled','state','suspended','probe','setVelocity','sound']
addresses={n:owner+0x3000+i*0x100 for i,n in enumerate(names)}
for target in [owner,other]:write(target,vtable)
for offset,name in [(0x5c,'position'),(0x60,'velocity'),(0x50,'type'),(0x64,'enabled'),(0x80,'state'),(0x6c,'suspended'),(0x100,'probe'),(0x104,'setVelocity'),(0x48,'sound')]:write(vtable+offset,addresses[name])
fields=dict(x=0x90,y=0x94,vx=0x9c,vy=0xa0,impact=0x124,mode=0x330,hitMask=0x2d4,armed=0x3b0,delay=0x3ac,phase=0x394,sideMask=0x344,count=0x35c,chance=0x348,sound=0x340,effect=0x354,effectRange=0x358,effectKind=0x350,sprite=0x2ec,enabled=0x48,state=0x404,suspended=0x54,savedX=0x3b8,savedY=0x3bc,savedVx=0x3c0,savedVy=0x3c4,field3b4=0x3b4,impactVx=0x39c,impactVy=0x3a0,facing=0x3c8)
def signed(v):return v if v<0x80000000 else v-0x100000000
def hook(cpu,address,size,user):
    name=next((n for n,a in addresses.items() if a==address),None)
    external={0x4ee960:('random',0),0x4f4c30:('respond',8),0x4e2f60:('specialEffect',12),0x4ee8a0:('effectRandom',8),0x4ef070:('effect',24)}
    if name is None and address not in external:return
    sp=cpu.reg_read(UC_X86_REG_ESP);target=cpu.reg_read(UC_X86_REG_ECX)
    arg=lambda i:signed(read(sp+4+4*i))
    cleanup=0;result=0
    if name in ['position','velocity']:
        offset=0x90 if name=='position' else 0x9c
        write(arg(0),read(target+offset));write(arg(1),read(target+offset+4));cleanup=8
    elif name=='type':result=case['otherType']
    elif name in ['enabled','state','suspended']:
        write(target+fields[name],arg(0)&0xffffffff);calls.append(dict(operation=name,value=arg(0)));cleanup=4
    elif name=='probe':
        calls.append(dict(operation='probe',request=[arg(0),arg(1)]));result=case['probe'];cleanup=8
    elif name=='setVelocity':
        write(target+0x9c,arg(0)&0xffffffff);write(target+0xa0,arg(1)&0xffffffff);cleanup=8
        calls.append(dict(operation=name,request=[arg(0),arg(1)]))
    elif name=='sound':
        cleanup=16;calls.append(dict(operation=name,request=[arg(i) for i in range(4)]))
    else:
        name,cleanup=external[address]
        if name=='random':result=case['random'];calls.append(dict(operation=name))
        elif name=='respond':
            calls.append(dict(operation=name,side=arg(1)))
            if case['mutate']:
                write(owner+0x9c,777);write(owner+0xa0,888);write(owner+0x90,(read(owner+0x90)+65536)&0xffffffff)
        else:
            calls.append(dict(operation=name,request=[arg(i) for i in range(cleanup//4)]))
            if name=='effectRandom':result=77
    cpu.reg_write(UC_X86_REG_EAX,result&0xffffffff);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for mode in [1,2,3,4]:
 for side in [1,2,3,4]:
  for variant in range(24):
   for velocityIndex,(vx,vy) in enumerate([(0,0),(0x30000,-0x20000),(-0x30000,0x20000),(0x70000000,0x70000000)]):
    body={k:0 for k in fields}
    body.update(x=0x170000,y=0x310000,vx=vx,vy=vy,impact=0x7ffffffe if variant==23 else 100,mode=mode,hitMask=4 if variant%6==0 else 0,armed=int(variant==1),delay=10 if variant==2 else 0,phase=2 if variant==3 else 0,sideMask=30 if variant%4 else 0,count=[0,1,2,-1][variant%4],chance=[0,50,100,101][variant%4],sound=12 if variant%2 else 0,effect=4 if variant%3 else 0,effectRange=7,effectKind=9,sprite=0x2ab if variant%2 else 0,enabled=1,facing=1)
    case=dict(otherType=[1,2,3,6,15,33][(variant//6+velocityIndex)%6],mutate=variant==22,side=side,probe=variant%2,random=[0,49,50,99,0xf0000000,1023][variant%6])
    for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
    cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,other,side));cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    calls=[];cpu.emu_start(0x4e2240,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Callback did not finish')
    output={name:signed(read(owner+offset)) for name,offset in fields.items()}
    cases.append(dict(body=body,environment=case,output=output,calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004E2240 callback; getters, setters, collision probe, receiver dispatch, RNG and effects supplied/captured. No downstream state entry or effect execution.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} projectile contact cases')
