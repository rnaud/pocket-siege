"""Execute original004D6AD0 special type3/type4 receivers with original impulse and momentum routines."""
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

incoming,context=owner+0x2000,0x2300000
cpu.mem_map(context,0x20000)
vtable=owner+0x3000
addresses={name:owner+0x4000+i*0x100 for i,name in enumerate(['position','velocity','state','type','setState','setVelocity','record'])}
for target in [owner,incoming]:write(target,vtable);write(target+0x38,context)
for offset,name in [(0x5c,'position'),(0x60,'velocity'),(0x7c,'state'),(0x50,'type'),(0x80,'setState'),(0x104,'setVelocity'),(0xc,'record')]:write(vtable+offset,addresses[name])
write(vtable+0x118,0x4f4cb0)
def signed(value):return value if value<0x80000000 else value-0x100000000
def hook(cpu,address,size,user):
    global calls
    name=next((n for n,a in addresses.items() if a==address),None)
    extern={0x4ee960:('random',0),0x4edaf0:('voice',8),0x4edc30:('stopSound',4),0x4edb90:('sound',20),0x4c2d20:('resolve',4)}
    if name is None and address not in extern:return
    sp=cpu.reg_read(UC_X86_REG_ESP);target=cpu.reg_read(UC_X86_REG_ECX)
    arg=lambda i:read(sp+4+i*4)
    result=0;cleanup=0
    if name in ['position','velocity']:
        offset=0x90 if name=='position' else 0x9c
        write(arg(0),read(target+offset));write(arg(1),read(target+offset+4));cleanup=8
    elif name in ['state','type']:result=read(target+(0x404 if name=='state' else 0x3c))
    elif name=='setState':
        write(target+0x404,arg(0));calls.append(dict(operation='state',target=arg(0)));cleanup=4
    elif name=='setVelocity':
        write(target+0x9c,arg(0));write(target+0xa0,arg(1));cleanup=8
    elif name=='record':
        assert arg(0)==0x7d3 and arg(1)==0x154
        write(arg(2),7);write(arg(2)+4,11);write(arg(2)+36,case['marked'])
        result=case['record'];cleanup=12
    else:
        name,cleanup=extern[address]
        if name=='random':result=case['random'];calls.append(dict(operation='random'))
        elif name=='voice':
            calls.append(dict(operation='voice',team=arg(0),slot=arg(1)));result=123
        elif name=='stopSound':calls.append(dict(operation='stopSound',handle=arg(0)))
        elif name=='sound':
            calls.append(dict(operation='sound',request=[arg(i) for i in range(5)]));result=456
        elif name=='resolve':result=11 if case['matched'] else 12
    cpu.reg_write(UC_X86_REG_EAX,result)
    cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup)
    cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
inputs=[]
for state in [0x65,0x79,0x7e,0x7f,0x80,0x81,0x88]:
 for incoming_state in [0x7e,0x7f,0x80,0x81,0x82]:
  for vx in [-0x800000, -65537,0,0x70000,0x30000000]:
   for marked,matched,record,scale in [(0,0,1,50),(1,0,1,50),(1,1,1,50),(1,1,1,255),(1,1,0,100)]:
    inputs.append(dict(state=state,incoming_state=incoming_state,type=3,vx=vx,dy=0,dx=0,marked=marked,matched=matched,record=record,scale=scale))
for state in [0x65,0x79,0x80,0x88]:
 for dy in [-0x90000,0,0x7ffff,0x80000,0x80001,0x90000]:
  for dx in [-0x90000,-0x80000,0,0x80000,0x90000]:
   inputs.append(dict(state=state,incoming_state=0x79,type=4,vx=0x30000,dy=dy,dx=dx,marked=0,matched=0,record=1,scale=100))
for index,case in enumerate(inputs):
    case.update(random=index%256,side=index%4+1)
    a=dict(x=0,y=0,vx=65536,vy=-32768,mass=[32768,65536,131072][index%3],tangent=0xf5c2,state=case['state'],suspended=int(index%13==0),team=2,soundHandle=99 if index%2 else 0)
    b=dict(x=case['dx'],y=case['dy'],vx=case['vx'],vy=0x50000,mass=65536,state=case['incoming_state'],type=case['type'])
    for target,body in [(owner,a),(incoming,b)]:
        for key,offset in [('x',0x90),('y',0x94),('vx',0x9c),('vy',0xa0),('mass',0x58),('state',0x404),('type',0x3c),('suspended',0x54),('team',0xfc),('soundHandle',0x38c)]:write(target+offset,body.get(key,0)&0xffffffff)
    write(owner+0x80,a['tangent']);write(owner+0xa4,0)
    cpu.mem_write(context+0x11d6e,bytes([case['scale']]))
    cpu.mem_write(stack+0xff00,struct.pack('<3I',stop,incoming,case['side']))
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    calls=[]
    cpu.emu_start(0x4d6ad0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Receiver did not return')
    cases.append(dict(receiver=a,incoming=b,environment=case,receiver_out=[signed(read(owner+o)) for o in [0x9c,0xa0,0x404,0x38c]],incoming_out=[signed(read(incoming+o)) for o in [0x9c,0xa0]],result=cpu.reg_read(UC_X86_REG_EAX),calls=calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004D6AD0,004F4CB0,004F4990. Position, velocity, state, attribution record/resolver and audio/RNG interfaces supplied; state entry captured without downstream effects.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} special receiver cases')
