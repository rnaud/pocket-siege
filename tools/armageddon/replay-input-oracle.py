"""Execute original input collection with native event writes and occupancy guard."""
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

import itertools
root=owner+0x1000;queue=owner+0x2000;ring=owner+0x2100;buffer=owner+0x4000
write(owner,owner+0x800);write(owner+0x808,stop+0x40);write(owner+4,root)
write(root,root+0x800);write(root+0x808,stop+0x50);write(queue+4,ring)
calls=[]
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==stop:cpu.emu_stop()
 elif address==stop+0x40:
  calls.append(['device',read(sp+4)==queue]);ret(0,4)
 elif address==stop+0x50:
  calls.append(['root',read(sp+8),read(sp+12),read(read(sp+16))==queue]);ret(0,16)
cpu.hook_add(UC_HOOK_CODE,hook)
def invoke(address,this,args=[]):
 sp=stack+0xf000;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,this);cpu.emu_start(address,stop+1,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('input helper did not exit')
def events():
 result=[];node=read(ring+0x18)
 while node:
  length=read(node);result.append([read(node+8),list(cpu.mem_read(node+12,length-4))]);node=read(node+4)
 return result
cases=[]
for capacity,flags,mode,fillIndex in itertools.product([32,64,128,4096],range(4),[-1,0,1],range(7)):
 fill=[None,0,capacity//2-16,capacity//2-12,capacity//2-8,capacity-32,capacity-16][fillIndex]
 cpu.mem_write(ring,bytes(32));write(ring+4,buffer);write(ring+8,capacity);cpu.mem_write(buffer,bytes(capacity))
 if fill is not None:
  cpu.mem_write(owner+0x8000,bytes([7])*fill);invoke(0x49c7f0,queue,[0x499,fill,owner+0x8000])
 for offset,value in [(0x15c,0x87654321),(0x160,0xfedcba98),(0x164,flags&1),(0x284,flags&2),(0x290,mode)]:write(owner+offset,value)
 calls.clear();invoke(0x4a1700,owner,[queue]);invoke(0x49c710,queue)
 cases.append({'capacity':capacity,'flags':flags,'mode':mode,'fill':fill,'result':{'calls':list(calls),'events':events(),'flags':[read(owner+0x164),read(owner+0x284)],'percent':signed(cpu.reg_read(UC_X86_REG_EAX))}})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004A1700 with original0049C7F0 queue writes,0049C710 occupancy and ring allocator.336 cases cover signed input mode, both pending flags, four capacities and empty/near50percent/nearfull buffers. Only root3EC and manager input virtual interfaces substituted; packet queue pointer normalized to identity. Flags clear even when writes fail.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} native input collections')
