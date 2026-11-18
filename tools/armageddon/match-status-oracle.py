"""Execute runtime actor teardown with original base/physics/text destruction and scene bookkeeping."""
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


import base64,zlib,itertools
context=0x2300000;cpu.mem_map(context,0x20000);output=owner+0xa000
cases=[]
for mode,seed,flags in itertools.product([-1,0,1,2,3,4],range(32),range(8)):
 cpu.mem_write(owner,bytes(0x10000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
 for offset,value in [(0x128,seed%3),(0x12c,seed*13),(0x140,flags&1),(0x14c,flags&2),(0x150,flags&4),(0x154,seed%2),(0x174,seed%2),(0x180,seed%4),(0x188,0x80000000+seed)]:write(owner+offset,value)
 write(context+0x1b90,int(seed==31));cpu.mem_write(context+0x11d5d,bytes([int(seed%7==0)]));write(context+0x11d78,mode);write(context+0x3a48,6)
 for team in range(1,7):
  row=context+0x1b94+team*0x51c;write(row,2);write(row-12,int((seed+team)%11==0))
  write(row-0x49c,[0,100,-100,0x7fffffff][(seed+team)%4]);write(row-0x400,[0,50,100,1][(seed+team*3)%4])
  record=context+0x4888+(team-1)*3000;cpu.mem_write(record,bytes([255 if seed&(1<<(team-1)) else team,0,int((seed+team)%5==0),(seed+team)%3]))
 panel=owner+0x1000;group=owner+0x1200;teams=owner+0x1400;leaf=owner+0x1600
 write(context+0x7dc,panel);write(panel,0x526828);write(panel+4,int(seed%4!=0));write(panel+12,panel+0x100);write(panel+0x100,group)
 write(group,0x5267e8);write(group+12,teams);write(teams,0x526780);write(teams+4,int(seed%4!=1));write(teams+12,teams+0x100);write(teams+0x100,leaf);write(leaf,0x526740);write(leaf+4,seed%7)
 cpu.mem_write(output,bytes([0xcc])*0x154);event=0x7d3 if seed==30 else 0x7d2
 initial=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))
 sp=stack+0xf000
 for i,v in enumerate([stop,event,[0,4,0x154][seed%3],output]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4b7970,stop,count=100000)
 assert cpu.reg_read(UC_X86_REG_EIP)==stop
 final=bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(context,0x20000))
 cases.append(dict(event=event,inputMemory=base64.b64encode(zlib.compress(initial)).decode(),result=cpu.reg_read(UC_X86_REG_EAX),sha256=hashlib.sha256(final).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='1536 complete004B7970 native match-status queries. Original signed health sums, living alliance filters, end-state gates and nested first-panel-team virtual queries execute without interfaces. Full192KiB owner/output/scene memory compared; unknown queries preserve output. Six modes, signed overflow, surrender/retirement, human/AI alliances and empty/nested panels are covered.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'native match queries')
