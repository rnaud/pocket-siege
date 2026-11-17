"""Execute original nuclear environmental effect tick."""
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
fields={'volume':0x54,'target':0x58,'progress':0x5c,'duration':0x60,'handleA':0xbc,'handleB':0xc0}
shared={'flash':0x12484,'fade':0x1248c,'shake':0x1b8c4,'busy':0x800}
calls=[]
def ret(cleanup,value=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4edb90:
  request=[signed(read(sp+i*4)) for i in range(1,6)];handle=301 if request[0]==0x10004 else 302
  calls.append({'operation':'play','request':request,'handle':handle});ret(20,handle)
 elif address==0x4edbe0:
  calls.append({'operation':'volume','handle':read(sp+4),'volume':signed(read(sp+8))});ret(8)
 elif address==0x4edc30:
  calls.append({'operation':'stop','handle':read(sp+4)});ret(4)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for progress in [-1,0,16384,32767,32768,65535,65536]:
 for duration in [1,8,60]:
  for volume in [0,1000,3276,3277,65536,70000]:
   for handles in [(0,0),(11,0),(0,12),(11,12)]:
    body=dict(volume=volume,target=123,progress=progress,duration=duration,handleA=handles[0],handleB=handles[1],flash=55,fade=66,shake=77,busy=0)
    for k,o in fields.items():write(owner+o,body[k])
    for k,o in shared.items():write(context+o,body[k])
    sp=stack+0xf000;write(sp,stop);calls.clear()
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
    cpu.emu_start(0x4eb460,stop,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Effect did not return')
    after=dict([(k,signed(read(owner+o))) for k,o in fields.items()]+[(k,signed(read(context+o))) for k,o in shared.items()])
    cases.append({'input':body,'result':{'body':after,'calls':list(calls)}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004EB460','method':'Full tick, clamp and busy helper execute unchanged. Audio play/volume/stop captured with stable synthetic handles.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} environmental effect ticks')
