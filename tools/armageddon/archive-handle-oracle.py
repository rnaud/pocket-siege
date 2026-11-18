"""Execute original archive handle lifecycle with explicit transport and heap interfaces."""
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


handle=owner+0x8000

def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==stop+0x100:
  calls.append(['seek',receiver,signed(read(sp+4)),snapshot()]);ret(0 if mode==1 else 1,4)
 elif address==stop+0x200:
  dest,n=read(sp+4),read(sp+8);calls.append(['read',receiver,dest,signed(n),snapshot()])
  if n<0x1000:cpu.mem_write(dest,bytes((i*17)&255 for i in range(n)))
  if mode==3:write(owner+slot*16+24,111)
  ret(n-1 if mode==2 else n,8)
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
for a in [stop+0x100,stop+0x200,0x492590]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
def run(entry,receiver,args=[]):
 sp=stack+0xf000;write(sp,stop)
 for i,v in enumerate(args):write(sp+4+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.emu_start(entry,stop,count=10000)
 assert cpu.reg_read(UC_X86_REG_EIP)==stop
 return cpu.reg_read(UC_X86_REG_EAX)
cases=[]
for pattern in [0,0xa5]:
 for slot in [7,3,15,-1,16]:
  for mode in range(4):
   for size in [0,4,64]:
    calls=[];cpu.mem_write(owner,bytes([pattern])*0x10000)
    write(owner,owner+0x6000);write(owner+0x6008,stop+0x200);write(owner+0x600c,stop+0x100)
    write(handle,0x5265d4);write(handle+4,slot);write(handle+8,owner)
    write(owner+0x190,3);write(owner+0x18c,13)
    for i,s in enumerate([7,3,15]):
     write(owner+0x14c+i*4,s);write(owner+s*16+12,handle);write(owner+s*16+16,100);write(owner+s*16+20,120);write(owner+s*16+24,[100,118,120,125][mode])
    before=run(0x4acb80,handle);result=run(0x4acc70,handle,[owner+0x7000,size]);after=run(0x4acb80,handle)
    destroyed=run(0x4ac9b0,handle,[mode&1])
    cases.append(dict(pattern=pattern,slot=slot,mode=mode,size=size,before=before,result=result,after=after,destroyed=destroyed,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004ACB80 +004ACC70/004ADA20 +004AC9B0',method='120 original tell/read/tell/destroy sequences compare64KiB memory at transport/free callbacks and completion. Includes invalid slots, cursor bounds, zero reads, short reads, seek failure, callback cursor mutation and slot compaction. Transport/free are interfaces.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} archive handle sequences')
