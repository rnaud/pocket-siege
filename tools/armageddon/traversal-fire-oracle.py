"""Execute original004F9600 traversal firing with captured interfaces."""
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
setState=owner+0x5000
write(owner,vt);write(vt+0x80,setState);write(owner+0x354,record)
fields={'weapon':0x170,'enabled':0x2a0,'field27c':0x27c,'shots':0x298,'power':0x25c,'field2a4':0x2a4,'field2a8':0x2a8,'state':0x84,'aim':0x260,'facing':0x1b0,'ropeActive':0x264,'ropeRemaining':0x268,'ropeFiring':0x26c,'ropeProgress':0x270,'ropeLength':0x274,'ropeAngle':0x278}
helpers={setState:'state',0x4edb10:'beginAction',0x4edad0:'weaponRecord',0x4edb40:'continueAction',0x4edc90:'sound',0x4f9c30:'placed',0x4f9d90:'utility',0x4faf90:'launchSetup',0x4fa840:'launch',0x4d75e0:'finish'}
def hook(cpu,address,size,user):
 if address not in helpers:return
 sp=cpu.reg_read(UC_X86_REG_ESP);arg=lambda i:read(sp+4+i*4);count=0
 op=helpers[address]
 if op=='state':
  calls.append(dict(operation=op,value=signed(arg(0))));write(owner+0x84,arg(0));count=1
 elif op=='sound':
  count=5;calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(count)]))
 elif op=='weaponRecord':
  calls.append(dict(operation=op,slot=arg(0)));count=1;cpu.reg_write(UC_X86_REG_EAX,ropeRecord)
 elif op=='continueAction':
  calls.append(dict(operation=op))
  if options['activateRope']:write(owner+0x264,1)
 elif op in ['placed','utility']:
  calls.append(dict(operation=op));cpu.reg_write(UC_X86_REG_EAX,options['delegate'])
 elif op=='launchSetup':
  calls.append(dict(operation=op,value=arg(4)));count=5
  for i,value in enumerate(options['vector']):write(arg(i),value)
 elif op=='launch':
  calls.append(dict(operation=op,request=[signed(arg(i)) for i in range(4)]));count=4
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
 cpu.emu_start(0x4f9600,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Traversal fire failed to return')
 output=dict(body={key:signed(read(owner+offset)) for key,offset in fields.items()},record=config,result=signed(cpu.reg_read(UC_X86_REG_EAX)),calls=calls)
 cases.append(dict(body=body,record=config,options=options,output=output))
def initial():return dict(weapon=37,enabled=1,field27c=93,shots=0,power=65536,field2a4=4,field2a8=8,state=0x79,aim=32768,facing=1,ropeActive=0,ropeRemaining=3,ropeFiring=0,ropeProgress=91,ropeLength=92,ropeAngle=93)
def opts():return dict(delegate=1,rope=0x6402,activateRope=0,vector=[-123456,987654,2147483647,-2147483648])
for kind in [-1,0,1,2,3,4,5]:
 for subtype in range(26):
  for weapon,enabled,result,shots in [(37,1,1,0),(37,1,-7,2147483647),(0,1,1,0),(37,0,1,0)]:
   body=initial();body.update(weapon=weapon,enabled=enabled,shots=shots)
   options=opts();options['delegate']=result;capture(body,{'0x68':kind,'0x6c':subtype},options)
for packed in [0,0x6402,0x16402,0x26402,0xff80ff]:
 for aim in [-2147483648,-1,0,0x3332,0x3333,0x7fff,0x8000,0xbfff,0xc000,65536,65537,2147483647]:
  for facing in [-1,1]:
   for active,firing,activate in [(0,0,0),(1,0,0),(0,1,0),(0,0,1)]:
    body=initial();body.update(aim=aim,facing=facing,ropeActive=active,ropeFiring=firing)
    options=opts();options.update(rope=packed,activateRope=activate);capture(body,{'0x68':4,'0x6c':6},options)
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004F9600 with real0049BF90 clamp. State setter, action flags, packed rope record lookup, delegated placed/utility fire, sound, launch and finish captured. Continue-action can activate rope to test the native recheck. Downstream entry/exit, rope simulation and launched tasks are not executed.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} traversal-fire cases')
