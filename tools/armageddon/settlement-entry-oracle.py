"""Execute original settlement entry gates and turn deactivation."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
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

context=owner+0x20000;cpu.mem_map(context,0x20000);write(owner+0x38,context)
fields={'activeTeam':(owner,0x128),'activeWorm':(owner,0x12c),'endRequested':(owner,0x14c),'turnState':(owner,0x16c),'retreatPending':(owner,0x170),'retreatRemaining':(owner,0x174),'selectionFlag':(owner,0x1dc),'clockTarget':(owner,0x190),'busy':(context,0x800),'endReason':(context,0x1b90),'inputMode':(context,0x820),'endAfterTurn':(context,0x11d61),'cameraCap':(context,0x12414)}
write(owner,owner+0x1000);write(owner+0x1008,stop+0x100)
calls=[];queries={}
stops=[0x4b7771,0x4b6e2e,0x4b6ead,0x4b6ede]
def ret(value,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 if address in stops:cpu.emu_stop();return
 if address==0x4eec10:calls.append({'operation':'busy'})
 elif address in [0x4b39a0,0x4ec190,0x4c32b0]:
  name={0x4b39a0:'matchOver',0x4ec190:'healthPending',0x4c32b0:'activeMotion'}[address]
  calls.append({'operation':name});ret(queries[name],8 if address==0x4c32b0 else 0)
 elif address==0x4b35f0:calls.append({'operation':'endActive'})
 elif address==0x4eea10:
  calls.append({'operation':'cameraPriority','value':read(cpu.reg_read(UC_X86_REG_ESP)+4)})
 elif address==stop+0x100:
  sp=cpu.reg_read(UC_X86_REG_ESP);calls.append({'operation':'event','event':read(sp+8),'record':[signed(read(read(sp+16)))]});ret(0,16)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for bits in range(64):
 for active in [0,2]:
  for busy in [-1,0,12]:
   for endAfterTurn in [0,7]:
    queries={name:(bits>>i)&1 for i,name in enumerate(['matchOver','healthPending','activeMotion'])}
    body={'activeTeam':active,'activeWorm':3,'endRequested':3 if bits&8 else 0,'turnState':4,'retreatPending':2 if bits&16 else 0,'retreatRemaining':20 if bits&32 else 0,'selectionFlag':5,'clockTarget':65536,'busy':busy,'endReason':9,'inputMode':11,'endAfterTurn':endAfterTurn,'cameraCap':6}
    for k,(address,offset) in fields.items():write(address+offset,body[k])
    for i in range(15):write(context+0x12490+i*20,i+1)
    calls.clear();cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xf000)
    cpu.emu_start(0x4b6dff,stop,count=1000)
    end=cpu.reg_read(UC_X86_REG_EIP)
    if end not in stops:raise RuntimeError('Gate did not exit')
    after={k:signed(read(address+offset)) for k,(address,offset) in fields.items()}
    groups=[read(context+0x12490+i*20) for i in range(15)]
    cases.append({'input':dict(body,**queries,cameraCounts=list(range(1,16))),'result':{'body':dict(after,cameraCounts=groups),'calls':list(calls),'ready':end==0x4b6ede}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004B6DFF..004B6EDE,004B35F0','method':'Original gates plus complete deactivation and camera-priority reset execute unchanged. Match/health/motion query values explicit; event interfaces captured with receiver-consumed team word. Busy getter unchanged.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} settlement entry decisions')
