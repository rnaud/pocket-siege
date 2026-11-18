"""Execute original DirectX2D palette loading, access and destruction."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EDX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '520ed7e2900c30735f52732e6921ca804c88992b4632c13968f95e236635ad8c':
    parser.error('DLL differs from the original DirectX2D build')
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




device=0x2300000;cpu.mem_map(device,0x10000)
write(device,device+0x100);write(device+0x114,stop+0x100)
write(device+0x200,device+0x300);write(device+0x308,stop+0x200);write(device+0x310,stop+0x300)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return bytes(result)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 global allocations,entries
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x10003f80:
  calls.append(['openFile',cstring(read(sp+4)).decode(),cstring(read(sp+8)).decode(),snapshot()]);ret(0 if missing else 0x5678)
 elif address==0x10003a30:
  calls.append(['allocate',read(sp+4),snapshot()]);value=owner+0x1000+allocations*0x2000;allocations+=1;ret(value)
 elif address==0x10003a40:
  calls.append(['free',read(sp+4),snapshot()]);ret()
 elif address==0x10003e60:
  calls.append(['seekFile',read(sp+4),read(sp+8),read(sp+12),snapshot()]);ret()
 elif address==0x10003ce0:
  dest,size,count,file=[read(sp+i) for i in [4,8,12,16]];calls.append(['readFile',dest,size,count,file,snapshot()])
  if amount:cpu.mem_write(dest,payload[:amount])
  ret(amount)
 elif address==0x10003c30:
  calls.append(['closeFile',read(sp+4),snapshot()]);ret()
 elif address==stop+0x100:
  handle,flags,data,dest,outer=[read(sp+i) for i in [4,8,12,16,20]];entries=bytes(cpu.mem_read(data,1024))
  calls.append(['createPalette',handle,flags,entries.hex(),dest,outer,snapshot()]);write(dest,device+0x200);ret(createResult,20)
 elif address==stop+0x200:
  calls.append(['releasePalette',read(sp+4),snapshot()]);ret(0,4)
 elif address==stop+0x300:
  args=[read(sp+i) for i in [4,8,12,16,20]];calls.append(['getPaletteEntries',*args,snapshot()])
  cpu.mem_write(args[4],entries[args[2]*4:(args[2]+args[3])*4]);ret(-123,20)
for address in [0x10003f80,0x10003a30,0x10003a40,0x10003e60,0x10003ce0,0x10003c30,stop+0x100,stop+0x200,stop+0x300]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
def run(address,ecx,edx=0,args=[]):
 sp=stack+0xe000;write(sp,stop)
 for i,value in enumerate(args):write(sp+4+i*4,value)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,ecx);cpu.reg_write(UC_X86_REG_EDX,edx)
 cpu.emu_start(address,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 return cpu.reg_read(UC_X86_REG_EAX)
cases=[]
for bits in [0,1,4,8,9,24,65535]:
 for amount in [0,1067,1068]:
  for missing in [False,True]:
   for createResult in [0,-1]:
    for pattern in [0,165]:
     cpu.mem_write(owner,bytes([pattern])*0x10000);write(0x1002a7c8,device);cpu.mem_write(stack,b'fixture.bmp\0')
     payload=bytearray((i*19+7)&255 for i in range(1068));struct.pack_into('<H',payload,14,bits);payload=bytes(payload)
     calls=[];allocations=0;entries=bytes(1024)
     result=run(0x10002070,owner,stack);loaded=snapshot();loadCalls=len(calls)
     access=run(0x100022a0,read(owner),owner+0x5000,[0,256]);accessed=snapshot();accessCalls=len(calls)
     destroyed=run(0x10002250,owner);final=snapshot()
     cases.append(dict(bits=bits,amount=amount,missing=missing,createResult=createResult,pattern=pattern,result=result,loaded=loaded,loadCalls=loadCalls,access=access,accessed=accessed,accessCalls=accessCalls,destroyed=destroyed,sha256=final,calls=calls))
destroyCases=[]
for refs in [0,1,2,0xffffffff]:
 for present in [False,True]:
  for empty in [False,True]:
   for pattern in [0,165]:
    cpu.mem_write(owner,bytes([pattern])*0x10000);write(owner,0 if empty else owner+0x3000);write(owner+0x3404,device+0x200);write(owner+0x340c,refs);write(0x1002a7c8,device if present else 0);calls=[]
    result=run(0x10002250,owner)
    destroyCases.append(dict(refs=refs,present=present,empty=empty,pattern=pattern,result=result,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(dllSha256=digest,entry='10002070 /100022A0 /10002250',method='Original DirectX2D palette functions execute through return with explicit CRT file/heap and DirectDraw interfaces. Full64KiB heap memory and ordered calls compare successful and missing/short files, palette conversion, unsupported bit depths, failed DirectDraw creation, ignored GetEntries results and reference-count cleanup.',cases=cases,destroyCases=destroyCases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} palette load/access/destruction sequences')
