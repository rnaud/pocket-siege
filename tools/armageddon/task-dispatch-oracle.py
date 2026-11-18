"""Execute native task forwarding and addressed event dispatch against the original executable."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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

registry=owner+0x4000;slots=owner+0x5000;alternate=owner+0x5100;payload=owner+0x5200;vtable=owner+0x5300
callback=stop+0x100;cpu.mem_write(callback,b'\xc2\x10\x00');write(vtable+8,callback)
def task(i):return owner+0x1000+i*0x100
for i in range(1,10):write(task(i),vtable)
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def store_children(values,address):
 write(owner+0x14,len(values));write(owner+0x18,address)
 for i,v in enumerate(values):write(address+i*4,task(v) if v else 0)
def hook(cpu,address,size,user):
 global mutated
 sp=cpu.reg_read(UC_X86_REG_ESP);identity=(cpu.reg_read(UC_X86_REG_ECX)-owner-0x1000)//0x100
 calls.append([identity,read(sp+4),read(sp+8),read(sp+12),list(cpu.mem_read(read(sp+16),4))])
 if mode=='forward' and not mutated:
  mutated=True
  if action=='append':children.append(9);store_children(children,slots)
  elif action=='truncate':children[:]=children[:1];store_children(children,slots)
  elif action=='clear_next' and len(children)>1:children[1]=0;store_children(children,slots)
  elif action=='replace':children[:]=[8,9,7];store_children(children,alternate)
 cpu.reg_write(UC_X86_REG_EAX,0)
cpu.hook_add(UC_HOOK_CODE,hook,begin=callback,end=callback)
write(payload,0x76543210);forward=[];send=[]
mode='forward'
for original in [[],[0],[1],[1,2,3],[0,1,0,2],[1,0,2,0,3],[0,0,3]]:
 for action in ['none','append','truncate','clear_next','replace']:
  children=original[:];store_children(children,slots);calls=[];mutated=False;sp=stack+0xf000
  for i,v in enumerate([stop,123,0x440,4,payload]):write(sp+i*4,v)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4b26f0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  forward.append(dict(children=original,action=action,calls=calls,result=children[:]))
mode='send'
for typ,index in [(2,3),(20,0),(2,-1),(-1,0),(2147483647,2147483647)]:
 for variant in range(8):
  cpu.mem_write(registry-0x400,bytes(0x900));write(owner+0x30,registry)
  total=(index*17+typ)&0xffffffff;total=total if total<0x80000000 else total-0x100000000;bucket=abs(total)%256*(-1 if total<0 else 1)
  entries=[dict(type=typ,index=index+1,task=1)]
  if variant&1:entries.append(dict(type=typ,index=index,task=2))
  if variant&2:entries.append(dict(type=typ,index=index,task=3))
  if variant&4:entries=[]
  for i,e in enumerate(entries):
   address=owner+0x6000+i*0x20
   for o,v in [(4,owner+0x6000+(i+1)*0x20 if i+1<len(entries) else 0),(8,e['type']),(12,e['index']),(16,task(e['task']))]:write(address+o,v&0xffffffff)
  write(registry+4+bucket*4,owner+0x6000 if entries else 0)
  calls=[];sp=stack+0xf000
  for i,v in enumerate([stop,123,typ,index,0x440,4,payload]):write(sp+i*4,v&0xffffffff)
  cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4b26a0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
  send.append(dict(type=typ,index=index,bucket=bucket,entries=entries,calls=calls,result=cpu.reg_read(UC_X86_REG_EAX)))
args.output.write_text(json.dumps(dict(executableSha256=digest,routines=['004B26F0','004B26A0','004CCF50'],forward=forward,send=send),separators=(',',':'))+'\n')
print(f'Wrote {len(forward)+len(send)} task dispatch cases')
