"""Execute original initial match setup through loadout construction and inventory import."""
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


context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
table=context+0x8000;callback=context+0x9000;children=context+0x4000;alternate=context+0x5000
cpu.mem_write(callback,b'\xc2\x10\x00');calls=[]
def hook(cpu,entry,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);at=cpu.reg_read(UC_X86_REG_ECX)
 calls.append([at]+[read(sp+4+i*4) for i in range(4)])
 if len(calls)==1:
  if mode==1:write(owner+20,0)
  elif mode==2:write(children+4,0)
  elif mode==3:write(owner+24,alternate)
  elif mode==4:write(children+count*4,context+0x700);write(owner+20,count+1)
  elif mode==5:write(owner+20,1)
cpu.hook_add(UC_HOOK_CODE,hook,begin=callback,end=callback)
cases=[]
for count in range(7):
 for mode in range(6):
  for mask in range(4):
   for enabled in [0,1]:
    cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0xa0)))
    cpu.mem_write(context,bytes(0x8000));write(table+8,callback)
    for i in range(8):write(context+i*0x100,table)
    for i in range(count):
     write(children+i*4,0 if mask==1 or mask==2 and i%2==0 or mask==3 and i%2 else context+i*0x100)
     write(alternate+i*4,context+(7-i)*0x100)
    write(owner+20,count);write(owner+24,children);cpu.mem_write(owner+0x3c,bytes([enabled]));calls.clear()
    sp=stack+0xf000
    for i,value in enumerate([stop,0x12345678,0x3e8,4,0xdeadbeef]):write(sp+i*4,value)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4eaaa0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    cases.append(dict(count=count,mode=mode,mask=mask,enabled=enabled,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(owner,0xa0)+cpu.mem_read(context,0x8000)).hexdigest()))
sendCases=[]
keys=[[20,0],[3,1],[20,0],[-20,0],[0,-1],[2147483647,1]]
for key in keys+[[21,0],[20,1]]:
 cpu.mem_write(context,bytes(0x8000));cpu.mem_write(owner,bytes(0xa0));write(table+8,callback)
 registry=context+0x6000;write(owner+48,registry)
 for i,(kind,index) in enumerate(keys):
  node=context+0x1000+i*20;target=context+i*256;write(target,table)
  mixed=signed((index*17+kind)&0xffffffff);bucket=(abs(mixed)%256)*(-1 if mixed<0 else 1);head=registry+4+bucket*4
  write(node+4,read(head));write(node+8,kind);write(node+12,index);write(node+16,target);write(head,node)
 calls.clear();mode=0;sp=stack+0xf000
 for i,value in enumerate([stop,0x12345678]+key+[0x3e8,4,0xdeadbeef]):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4b26a0,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 sendCases.append(dict(key=key,calls=list(calls),result=cpu.reg_read(UC_X86_REG_EAX)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004EAAA0/004B26F0',method='Original event gate and child forwarding execute. Receiver callbacks mutate count, holes, backing array and appended children. Complete owner/list state and ordered receiver payloads compared.',cases=cases,send_keys=keys,send_cases=sendCases),separators=(',',':'))+'\n')
print('Captured',len(cases),'group dispatch sequences')
