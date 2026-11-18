"""Execute original persistent frontend seed service and starting order with bundled CRT."""
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
parser.add_argument('--runtime',type=Path,required=True)
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


# Map the bundled runtime at its preferred address; no DLL entry point runs.
runtime=args.runtime.read_bytes();runtime_digest=hashlib.sha256(runtime).hexdigest()
assert runtime_digest=='df9f2aab7f7119f214c5d743d961fde4bf324f19011fbbb7e9cf666856fba0ba'
pe=struct.unpack_from('<I',runtime,60)[0];opt=pe+24
runtime_base=struct.unpack_from('<I',runtime,opt+28)[0]
size=struct.unpack_from('<I',runtime,opt+56)[0]
cpu.mem_map(runtime_base,(size+0xfff)&~0xfff)
cpu.mem_write(runtime_base,runtime[:struct.unpack_from('<I',runtime,opt+60)[0]])
headers=opt+struct.unpack_from('<H',runtime,pe+20)[0]
for i in range(struct.unpack_from('<H',runtime,pe+6)[0]):
 _,rva,size,offset=struct.unpack_from('<IIII',runtime,headers+40*i+8)
 if size:cpu.mem_write(runtime_base+rva,runtime[offset:offset+size])
exports=runtime_base+struct.unpack_from('<I',runtime,opt+96)[0]
functions=runtime_base+read(exports+28);names=runtime_base+read(exports+32);ordinals=runtime_base+read(exports+36)
for i in range(read(exports+24)):
 address=runtime_base+read(names+i*4);name=bytes(cpu.mem_read(address,32)).split(b'\0')[0]
 if name==b'strncmp':
  ordinal=struct.unpack('<H',cpu.mem_read(ordinals+i*2,2))[0]
  write(0x51796c,runtime_base+read(functions+ordinal*4));break
else:raise RuntimeError('strncmp export missing')

# Original CRT arithmetic executes; only its thread-data accessor is supplied.
thread=stop+0x8000
cpu.mem_write(0x78009cb0,b'\xb8'+struct.pack('<I',thread)+b'\xc3')
write(0x517950,0x78023170);write(0x517918,0x78023180)
timeStub=stop+0x100;cpu.mem_write(timeStub,b'\xc3');write(0x517954,timeStub)
for address in [0x503f10,0x503f16]:cpu.mem_write(address,b'\xc2\x0c\x00')
def hook(cpu,address,size,user):
 global profile
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==timeStub:
  calls.append(['time',clock]);cpu.reg_write(UC_X86_REG_EAX,clock)
 elif address==0x503f10:
  fallback=read(sp+12);calls.append(['read',fallback]);cpu.reg_write(UC_X86_REG_EAX,fallback if profile is None else profile)
 elif address==0x503f16:
  profile=read(sp+12);calls.append(['write',profile]);cpu.reg_write(UC_X86_REG_EAX,1)
for address in [timeStub,0x503f10,0x503f16]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for clock in [0,1,0x7fffffff,0x80000000,0xffffffff]:
 for initial in [None,0,1,0x7fffffff,0x80000000,0xffffffff]:
  for banks,mapping in [(1,[0]),(2,[0,1,0,1]),(3,[0,0,2])]:
   profile=initial;writes=[[0xcd74,banks],[0x11a,len(mapping)]]+[[0x11f+i*3000,bank] for i,bank in enumerate(mapping)]
   cpu.mem_write(owner,bytes((i*7+3)&255 for i in range(0x10000)))
   for offset,value in writes:cpu.mem_write(owner+offset,bytes([value]))
   write(thread+0x14,1);steps=[]
   for entry in [0x4190c0,0x419840,0x419840]:
    calls=[];sp=stack+0xf000;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(entry,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
    steps.append(dict(entry=f'{entry:08X}',result=cpu.reg_read(UC_X86_REG_EAX),profile=profile,random_state=read(thread+0x14),calls=calls,sha256=hashlib.sha256(cpu.mem_read(owner,0x10000)).hexdigest()))
   cases.append(dict(clock=clock,initial=initial,writes=writes,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,runtime_sha256=runtime_digest,entry='004190C0 /00419130 /00419840 /MSVCRT rand+srand',method='Full original persistent seed service and starting-order selection execute with bundled CRT arithmetic; time, profile storage and CRT thread-data location are interfaces. Return values, ordered storage calls, CRT state and complete setup bytes compared.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} persistent seed sequences')
