"""Execute original water-rise start and tick routines."""
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
terrain=owner+0x1000;registry=owner+0x2000;payload=owner+0x3000
write(context+0x24,terrain);write(terrain,terrain+0x100);write(terrain+0x120,stop+0x100)
write(context+0x7d4,registry);write(registry,registry+0x100);write(registry+0x12c,stop+0x200)
fields={'start':0x44,'target':0x48,'progress':0x4c,'duration':0x50}
shared={'waterY':0x804,'cameraTop':0x1b8d4,'cameraBottom':0x1b8d8,'bottom':0x808,'busy':0x800}
calls=[]
def hook(cpu,address,size,user):
 if address in [stop+0x100,stop+0x200]:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  calls.append({'operation':'terrain' if address==stop+0x100 else 'registry','waterY':signed(read(sp+4))})
  target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,target)
cpu.hook_add(UC_HOOK_CODE,hook)
def run(body,entry,args=[]):
 calls.clear()
 for k,o in fields.items():write(owner+o,body[k])
 for k,o in shared.items():write(context+o,body[k])
 sp=stack+0xf000
 for i,v in enumerate([stop]+args):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Water routine did not return')
 return {'body':dict([(k,signed(read(owner+o))) for k,o in fields.items()]+[(k,signed(read(context+o))) for k,o in shared.items()]),'calls':list(calls)}
starts=[];ticks=[]
for waterY in [0,10,300,696]:
 for rise in [-10,0,1,20,255,1000]:
  for duration in [1,8,60]:
   body=dict(start=123,target=456,progress=-1,duration=2,waterY=waterY,cameraTop=0,cameraBottom=999,bottom=777,busy=0)
   write(payload,rise);write(payload+4,duration)
   result=run(body,0x4ecfb0,[owner,0x441,0x124,payload])
   starts.append({'input':body,'record':[rise,duration],'result':result})
   for progress in [-1,0,16384,32768,65535,65536]:
    tick=dict(result['body'],progress=progress,cameraTop=-100*65536,busy=0)
    ticks.append({'input':tick,'result':run(tick,0x4ecbf0)})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004ECFB0 event441 and004ECBF0','method':'Complete start event and water tick execute unchanged, including fixed multiply and busy helper. Terrain row removal and registry water-bound callbacks captured.','starts':starts,'ticks':ticks},separators=(',',':'))+'\n')
print(f'Captured {len(starts)} starts and {len(ticks)} water ticks')
