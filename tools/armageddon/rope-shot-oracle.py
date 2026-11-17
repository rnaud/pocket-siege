"""Execute original004F8230 rope-tip extension and attachment with captured interfaces."""
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

vt,world,terrain,tvt=owner+0x1000,owner+0x2000,owner+0x3000,owner+0x4000
velocity,position,state,setState,ray,attempt,attach=[owner+0x5000+i*0x100 for i in range(7)]
write(owner,vt);write(owner+0x38,world);write(world+0x24,terrain);write(terrain,tvt);write(tvt+0x24,ray)
for offset,address in [(0x60,velocity),(0x5c,position),(0x7c,state),(0x80,setState),(0x100,attempt),(0xcc,attach)]:write(vt+offset,address)
fields={'x':0x90,'y':0x94,'vx':0x9c,'vy':0xa0,'state':0x84,'field104':0x104,'field108':0x108,'team':0xfc,'worm':0x100,'weapon':0x170,'shots':0x298,'shotLimit':0x29c,'field2a4':0x2a4,'field2a8':0x2a8,'ropeActive':0x264,'ropeRemaining':0x268,'ropeFiring':0x26c,'ropeProgress':0x270,'ropeLength':0x274,'ropeAngle':0x278}
helpers={velocity:'velocity',position:'position',state:'getState',setState:'state',ray:'ray',attempt:'tryPosition',attach:'attach',0x4edc90:'sound',0x4c3360:'markAttached',0x4c32e0:'clearBlocked',0x4b26a0:'event',0x4d75e0:'finish'}
def hook(cpu,address,size,user):
 global attempts,attachments
 if address not in helpers:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 op=helpers[address]
 if op in ['velocity','position']:
  offset=0x9c if op=='velocity' else 0x90
  write(arg(0),read(owner+offset));write(arg(1),read(owner+offset+4));count=2
 elif op=='getState':cpu.reg_write(UC_X86_REG_EAX,read(owner+0x84))
 elif op=='state':
  calls.append(dict(operation=op,value=signed(arg(0))));write(owner+0x84,arg(0));count=1
  if options['activateOnState']:write(owner+0x264,1)
 elif op in ['ray','sound','markAttached','clearBlocked','tryPosition','attach']:
  count=5 if op in ['ray','sound'] else 3 if op in ['markAttached','clearBlocked'] else 2
  calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(count)]))
  if op=='ray':cpu.reg_write(UC_X86_REG_EAX,options['distance']&0xffffffff)
  elif op=='tryPosition':
   accept=options['positions'][attempts%len(options['positions'])];attempts+=1
   if accept:write(owner+0x90,arg(0));write(owner+0x94,arg(1))
   cpu.reg_write(UC_X86_REG_EAX,accept)
  elif op=='attach':
   attachments+=1;cpu.reg_write(UC_X86_REG_EAX,int(attachments==options['attachAt']))
 elif op=='event':
  count=6;calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(1,5)],data=[signed(read(arg(5)+i*4)) for i in range(8)]))
 else:calls.append(dict(operation=op))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
def capture(body,options):
 global calls,attempts,attachments
 for key,offset in fields.items():write(owner+offset,body[key])
 sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[];attempts=0;attachments=0
 cpu.emu_start(0x4f8230,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Rope shot failed to return')
 output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},calls=calls)
 cases.append(dict(body=body,options=options,attempts=attempts,attachments=attachments,output=output))
def initial():return dict(x=12345678,y=-8765432,vx=0,vy=0,state=0x70,field104=1,field108=0,team=2,worm=7,weapon=37,shots=0,shotLimit=1,field2a4=1,field2a8=1,ropeActive=0,ropeRemaining=2,ropeFiring=1,ropeProgress=0,ropeLength=378,ropeAngle=0x6000)
def opts():return dict(distance=-1,positions=[1],attachAt=1,activateOnState=0)
for current in list(range(256))+[-1,2147483647]:
 for vy in [0,0x7ffff,0x80000,-0x80000,-2147483648]:
  body=initial();body.update(state=current,vy=vy);options=opts();capture(body,options)
for progress,length in [(0,20),(0,21),(358,378),(357,378),(2147483647,378),(-21,0)]:
 for firing,f104,f108 in [(0,1,0),(1,0,0),(1,1,1),(1,1,0)]:
  body=initial();body.update(state=0x65,ropeProgress=progress,ropeLength=length,ropeFiring=firing,field104=f104,field108=f108);options=opts();capture(body,options)
for angle in [0,0x4000,0x6000,0x8000,0xc000,0xffff]:
 for distance in [0,17,2147483647]:
  for at in [0,1,5,9]:
   for active,remaining,shots,pattern,activate in [(0,2,0,[1],0),(1,-1,0,[0,1],0),(0,0,2147483647,[0],0),(0,3,0,[1],1)]:
    body=initial();body.update(ropeAngle=angle,ropeActive=active,ropeRemaining=remaining,shots=shots)
    options=opts();options.update(distance=distance,attachAt=at,positions=pattern,activateOnState=activate);capture(body,options)
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F8230 with real native trig. Motion getters, terrain ray, position attempts(+100), rope constraint attachment(+CC/004F51A0), team flags, state transitions, event431 and finish captured. Event comparison covers its eight initialized header words; opaque trailing payload bytes and downstream constraint/task effects are not asserted.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} rope-shot cases')
