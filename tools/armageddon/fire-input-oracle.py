"""Execute original004F9FA0 Fire-button state routing with captured interfaces."""
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

record,vt,ropeRecord=owner+0x2000,owner+0x1000,owner+0x3000
velocity,angular,state,setState=[owner+0x5000+i*0x100 for i in range(4)]
write(owner,vt);write(vt+0x60,velocity);write(vt+0x108,angular);write(vt+0x7c,state);write(vt+0x80,setState);write(owner+0x354,record)
fields={'weapon':0x170,'enabled':0x2a0,'shots':0x298,'power':0x25c,'field2a4':0x2a4,'field2a8':0x2a8,'field2d8':0x2d8,'state':0x84,'team':0xfc,'worm':0x100,'ropeActive':0x264,'ropeRemaining':0x268,'ropeFiring':0x26c,'ropeProgress':0x270,'ropeLength':0x274,'ropeAngle':0x278}
helpers={velocity:'velocity',angular:'angular',state:'getState',setState:'state',0x4c32b0:'blocked',0x4d6760:'camera',0x4edb10:'beginAction',0x4ee960:'random',0x4edaf0:'voice',0x4dd5d0:'speech',0x4dd610:'localSound',0x4edad0:'weaponRecord',0x4edb40:'continueAction',0x4edc90:'sound',0x4f9600:'traversalFire',0x4f9870:'immediateFire',0x4edc50:'failureSound'}
def hook(cpu,address,size,user):
 if address not in helpers:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 op=helpers[address]
 if op=='velocity':write(arg(0),0);write(arg(1),0);count=2
 elif op=='angular':write(arg(0),0);count=1
 elif op=='getState':cpu.reg_write(UC_X86_REG_EAX,read(owner+0x84))
 elif op=='state':
  calls.append(dict(operation=op,value=signed(arg(0))));write(owner+0x84,arg(0));count=1
 elif op=='blocked':
  calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(2)]));count=2;cpu.reg_write(UC_X86_REG_EAX,options['blocked'])
 elif op=='random':calls.append(dict(operation=op));cpu.reg_write(UC_X86_REG_EAX,options['random'])
 elif op=='voice':
  calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(2)]));count=2;cpu.reg_write(UC_X86_REG_EAX,321)
 elif op in ['speech','localSound','sound','failureSound']:
  count=4 if op in ['speech','localSound'] else 5
  calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(count)]))
 elif op=='weaponRecord':
  calls.append(dict(operation=op,slot=arg(0)));count=1;cpu.reg_write(UC_X86_REG_EAX,ropeRecord)
 elif op=='continueAction':
  calls.append(dict(operation=op))
  if options['clearRope']:write(owner+0x264,0)
 elif op in ['traversalFire','immediateFire']:
  calls.append(dict(operation=op));cpu.reg_write(UC_X86_REG_EAX,options['delegate'])
 else:calls.append(dict(operation=op))
 cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
def capture(body,config,options):
 global calls
 for key,offset in fields.items():write(owner+offset,body[key])
 for key,value in config.items():write(record+int(key,16),value)
 write(ropeRecord+0x70,options['rope'])
 sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp);calls=[]
 cpu.emu_start(0x4f9fa0,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Fire input failed to return')
 output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},record=config,calls=calls)
 cases.append(dict(body=body,record=config,options=options,output=output))
def initial(current):return dict(weapon=1,enabled=1,shots=0,power=65536,field2a4=4,field2a8=8,field2d8=3,state=current,team=2,worm=7,ropeActive=1,ropeRemaining=3,ropeFiring=0,ropeProgress=91,ropeLength=92,ropeAngle=93)
def opts():return dict(blocked=0,random=0,delegate=1,rope=0x6402,clearRope=0)
config={'0x68':1,'0x6c':3,'0x70':3,'0x74':5,'0x78':0}
for current in list(range(256))+[-1,2147483647]:
 for result in [0,1]:
  options=opts();options['delegate']=result;capture(initial(current),config,options)
configs=[(1,subtype,mode,power) for subtype in [0,2,3,7,10] for mode in range(6) for power in [0,30,-1,32768]]+[(2,subtype,mode,power) for subtype in [0,1] for mode in range(5) for power in [0,30,-1,32768]]+[(4,subtype,0,0) for subtype in range(27)]+[(kind,0,0,0) for kind in [-1,0,3,5]]
for kind,subtype,mode,power in configs:
 for current,weapon,enabled,blocked,random,shots in [(100,1,1,0,0,0),(101,1,1,0,65536,2147483647),(102,36,1,0,0,0),(103,1,1,0,0,0),(101,0,1,0,0,0),(101,1,0,0,0,0),(101,1,1,1,0,0)]:
  body=initial(current);body.update(weapon=weapon,enabled=enabled,shots=shots)
  options=opts();options.update(blocked=blocked,random=random)
  capture(body,{'0x68':kind,'0x6c':subtype,'0x70':mode,'0x74':5,'0x78':power},options)
for active,firing,remaining in [(1,0,3),(0,0,3),(1,1,3),(1,0,0),(1,0,-1)]:
 for packed in [0,0x6402,0xffff,0x80ff]:
  for clear in [0,1]:
   body=initial(0x73);body.update(ropeActive=active,ropeFiring=firing,ropeRemaining=remaining)
   options=opts();options.update(rope=packed,clearRope=clear);capture(body,config,options)
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F9FA0 machine code, including native state dispatch tables. Read-only motion getters, state getter/setter, blocked query, action flags, RNG, voice/audio, rope record lookup and delegated firing are captured interfaces. State setters mutate state without running downstream entry/exit; continue-action can clear rope-active to exercise its native recheck. Full task lifecycle is not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} Fire-input cases')
