"""Execute original scene terrain and world resource sequence."""
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
parser.add_argument('--image',type=Path,required=True)
parser.add_argument('--masks',type=Path,required=True)
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
owner, stack, stop = 0x3000000, 0x2100000, 0x2200000
cpu.mem_map(owner,0x400000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


sources=json.loads(args.image.read_text());mask=json.loads(args.masks.read_text())
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x400000))+bytes(cpu.mem_read(stack+0x8010,4))+bytes(cpu.mem_read(stack+0x8118,256))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global allocated,pixels
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x492550:
  allocated+=1;calls.append(['allocate',read(sp+4),snapshot()]);ret(owner+0x70000+allocated*0x100)
 elif address==0x4924d0:
  n=read(sp+8);calls.append(['array',n,read(sp+4),snapshot()]);result=pixels;pixels+=(n+15)&~15;ret(result)
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
 elif address==stop+0x100:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+0x9000,4)
 elif address==stop+0x200:
  value=cstring(read(sp+8))%read(sp+12);cpu.mem_write(read(sp+4),value.encode()+b'\0');ret(len(value))
 elif address==0x492710:
  name=cstring(read(sp+12));calls.append(['image',read(sp+4),read(sp+8),name,snapshot()]);ret(owner+0x9000 if name=='masks.img' else owner+0x10000+int(name[5:7])*0x40)
 elif address==0x4a78a0:
  values=[read(sp+i*4) for i in range(1,9)];calls.append(['terrain',receiver,*values,snapshot()])
  write(receiver,0x526588);write(receiver+0xc4,0x12345678);write(values[4],count)
  for i in range(count):write(values[5]+i*8,100+i*30);write(values[5]+i*8+4,200+i*20)
  ret(receiver,32)
 elif address==0x491fa0:calls.append(['pump',snapshot()]);ret()
 elif address==stop+0x300:calls.append(['dimensions',receiver,snapshot()]);write(read(sp+4),640);write(read(sp+8),480);ret(0,8)
 elif address==stop+0x400:calls.append(['clear',receiver,*[signed(read(sp+i*4)) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x500:calls.append(['draw',receiver,*[signed(read(sp+i*4)) for i in range(1,5)],snapshot()]);ret(0,16)
 elif address==stop+0x600:calls.append(['present',receiver,snapshot()]);ret()
write(0x5178f4,stop+0x200)
for a in [0x492550,0x4924d0,0x492590,0x492710,0x4a78a0,0x491fa0,*[stop+i*0x100 for i in range(1,7)]]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern,count in [(0,0),(0xa5,3)]:
 calls=[];allocated=0;pixels=owner+0x100000;cpu.mem_write(owner,bytes([pattern])*0x400000);cpu.mem_write(stack,bytes([pattern])*0x10000)
 for i,source in enumerate(sources):
  at=owner+0x20000+i*0x2000;cpu.mem_write(at,bytes(source['pixels']))
  for offset,v in [(0,0x5249b0),(4,1),(8,at),(12,8),(16,60),(20,60),(24,60),(28,0),(32,0),(36,60),(40,60)]:write(owner+0x10000+i*0x40+offset,v)
 cpu.mem_write(owner+0x60000,bytes(mask['pixels']))
 for offset,v in [(0,0x5249b0),(4,1),(8,owner+0x60000),(12,8),(16,512),(20,512),(24,64),(28,0),(32,0),(36,512),(40,64)]:write(owner+0x9000+offset,v)
 for offset,v in [(0x5cd0,owner+0x300000),(0x2ac,owner+0x7000),(0x300008,owner+0x6000),(0x30000c,0),(0x300020,0),(0x6000,owner+0x6100),(0x6114,stop+0x100),(0x6104,stop+0x300),(0x6144,stop+0x400),(0x6148,stop+0x500),(0x6160,stop+0x600),(0x2b4,owner+0x6000),(0x2bc,0),(0x2c0,841),(0x2c4,-100)]:write(owner+offset,v)
 cpu.reg_write(UC_X86_REG_ESP,stack+0x8000);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EBP,owner+0x6000)
 cpu.emu_start(0x4a56ba,0x4a5b30,count=100000000)
 assert cpu.reg_read(UC_X86_REG_EIP)==0x4a5b30
 cases.append(dict(pattern=pattern,count=count,calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='004A56BA..004A5B30',method='Two complete original middle-startup sequences compose working bitmap,terrain dispatch,eight fixed collision shapes,32 real arrow images and all shifted masks,spawn pool and both native loading-progress updates. Full4MiB owner memory plus spawn scratch match at callbacks and completion. Terrain constructor,named image loading,heap,renderer,event pump and sprintf remain interfaces; terrain port defaults to separately verified native constructor. Full scene startup and live ownership remain unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} composed world resource sequences')
