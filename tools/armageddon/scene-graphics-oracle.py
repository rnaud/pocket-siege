"""Execute scene construction followed by original graphics bootstrap."""
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


scene=0x2300000;frontend=0x2500000;services=0x2600000
for address,size in [(scene,0x20000),(frontend,0x10000),(services,0x10000)]:cpu.mem_map(address,size)
def snapshot():return hashlib.sha256(b''.join(bytes(cpu.mem_read(a,n)) for a,n in [(owner,0x10000),(scene,0x20000),(frontend,0x10000),(services,0x10000)])).hexdigest()
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('ascii')
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global allocations,colorIndex
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x4adac0:
  calls.append(['palette',read(sp+4),read(sp+8),snapshot()])
  if mutation:write(source+0x100,0x12345678)
  ret(0,8)
 elif address==0x492550:
  calls.append(['allocate',read(sp+4),snapshot()]);allocations+=1
  if mutation and allocations==1:write(source+0x104,0x87654321)
  ret(scene if allocations==1 else services+0x1000)
 elif address==0x4cc460:calls.append(['archive',receiver,cstring(read(sp+4)),snapshot()]);ret(1,4)
 elif address==0x4a6a70:
  calls.append(['banks',receiver,snapshot()])
  if mutation:cpu.mem_write(source+0xde,b'\x07')
  ret()
 elif address==0x4a6b10:calls.append(['fonts',receiver,snapshot()]);ret()
 elif address in [0x4a7570,0x4a75f0]:
  calls.append(['effects' if address==0x4a7570 else 'speech',receiver,read(sp+4),snapshot()])
  if mutation and address==0x4a7570:write(scene+12,services+0x500)
  ret(0,4)
 elif address==0x4adcb0:
  color=list(struct.unpack('<HHH',cpu.mem_read(read(sp+4),6)));calls.append(['color',receiver,color,snapshot()]);colorIndex+=1;ret(colorIndex,4)
 elif address==stop+0x100:
  calls.append(['dimensions',receiver,snapshot()]);write(read(sp+4),width);write(read(sp+8),height)
  if mutation:write(scene+8,services+0x200)
  ret(0,8)
 elif address==stop+0x200:calls.append(['clear',receiver,*[signed(read(sp+i*4)) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x300:calls.append(['present',receiver,snapshot()]);ret()
 elif address==stop+0x400:calls.append(['getPalette',receiver,read(sp+4),snapshot()]);ret(services+0x600,4)
for address in [0x4adac0,0x492550,0x4cc460,0x4a6a70,0x4a6b10,0x4a7570,0x4a75f0,0x4adcb0,stop+0x100,stop+0x200,stop+0x300,stop+0x400]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for pattern in [0,0xa5]:
 for offset in [None,-4,0,4,0x800]:
  for mutation in [False,True]:
   for variant in range(4):
    calls=[];allocations=0;colorIndex=10
    for address,size in [(owner,0x10000),(scene,0x20000),(frontend,0x10000),(services,0x10000)]:cpu.mem_write(address,bytes([pattern])*size)
    source=frontend if offset is None else scene+0x47a8+offset
    cpu.mem_write(source,bytes((i*13+variant*37)&255 for i in range(0xdc64)))
    for address in [services,services+0x200]:write(address,services+0x800)
    for offset_,target in [(4,stop+0x100),(0x44,stop+0x200),(0x60,stop+0x300),(0x14,stop+0x400)]:write(services+0x800+offset_,target)
    width,height=[(640,480),(641,479),(-641,-479),(-2147483648,2147483647)][variant]
    bindings=[services,services+0x400 if variant%2 else 0,services+0x700,1,2,3,0,4]
    sp=stack+0xf000;write(sp,stop)
    for i,v in enumerate([*bindings,source]):write(sp+4+i*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4a5350,0x4a56ba,count=1000000);assert cpu.reg_read(UC_X86_REG_EIP)==0x4a56ba
    cases.append(dict(pattern=pattern,offset=offset,mutation=mutation,variant=variant,width=width,height=height,bindings=bindings,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A5350..004A56BA',method='Original scene construction and graphics bootstrap execute, including graphics archive constructor,004A6820 three-surface clearing and004A68E0 team colors. Full320KiB memory at callbacks and completion. Archive opening, palette bank/font setup, palette add, renderer and effects/speech loading are explicit interfaces. Includes cached renderer identity, source and audio mutations, signed dimensions and overlapping payload copy. Terrain/resource backends and complete live startup remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} scene construction and graphics bootstrap sequences')
