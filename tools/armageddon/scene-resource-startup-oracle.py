"""Execute original complete offline scene startup."""
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
parser.add_argument('--graphics',type=Path,required=True)
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
cpu.mem_map(owner,0x800000)
for address in [stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000


sources=json.loads(args.image.read_text());mask=json.loads(args.masks.read_text())
terrain_cases=json.loads((Path(__file__).resolve().parents[2]/'tests/fixtures/armageddon/terrain-construction.json').read_text())['cases']
archive_data=[(args.executable.parents[2]/name).read_bytes() for name in ['DATA/CUSTOM/SNOW/LEVEL.DIR','DATA/WATER/BLUE/WATER.DIR']]
graphics_data=args.graphics.read_bytes()
graphics_offset=struct.unpack_from('<I',graphics_data,8)[0]+4
archive_data.insert(0,graphics_data)
cpu.mem_write(stop+0x1800,struct.pack('<H',0x0f7f))
cpu.mem_write(0x504110,b'\xd9\x2d'+struct.pack('<I',stop+0x1800)+b'\x83\xec\x08\xdf\x3c\x24\x58\x5a\xc3')
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x800000))+bytes(cpu.mem_read(stack+0x8010,4))+bytes(cpu.mem_read(stack+0x8118,256))+bytes(cpu.mem_read(stack+0x8218,0xb18))+bytes(cpu.mem_read(0x714be0,0x10000))+bytes(cpu.mem_read(0x560230,4))+bytes(cpu.mem_read(0x7d6058,256))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value)
def cstring(address):
 result=bytearray()
 while cpu.mem_read(address,1)!=b'\0':result+=cpu.mem_read(address,1);address+=1
 return result.decode('latin1')
def hook(cpu,address,size,user):
 global allocated,pixels,headers,archives,cursor,graphics_archive
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==0x492550:
  allocated+=1;n=read(sp+4);calls.append(['allocate',n,snapshot()])
  if n==0x1d44c:result=owner+0x300000
  elif n==0xb2c:result=owner+0xd0000
  else:result=headers;headers+=(n+15)&~15
  if n==0x19c:
   archives+=1
   if archives==0:graphics_archive=result
  ret(result)
 elif address==0x4924d0:
  n=read(sp+8);calls.append(['array',n,read(sp+4),snapshot()]);result=pixels;pixels+=(n+15)&~15;ret(result)
 elif address==0x492590:calls.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
 elif address==stop+0x100:calls.append(['palette',receiver,read(sp+4),snapshot()]);ret(owner+(0xb000 if read(sp+4)==2 else 0xa000),4)
 elif address==stop+0x200:
  fmt=cstring(read(sp+8));arg=read(sp+12);value=fmt%(cstring(arg) if '%s' in fmt else arg);cpu.mem_write(read(sp+4),value.encode()+b'\0');ret(len(value))
 elif address==0x492710:
  name=cstring(read(sp+12))
  if name in ['soil.img','grass.img']:return
  calls.append(['image',read(sp+4),read(sp+8),name,snapshot()]);ret(owner+0x9000 if name=='masks.img' else owner+0x9100 if name=='fill.img' else owner+0x10000+int(name[5:7])*0x40 if name.startswith('arrow') else owner+0xe000)
 elif address==0x491fa0:calls.append(['pump',snapshot()]);ret()
 elif address==stop+0x300:calls.append(['dimensions',receiver,snapshot()]);write(read(sp+4),640);write(read(sp+8),480);ret(0,8)
 elif address==stop+0x400:calls.append(['clear',receiver,*[signed(read(sp+i*4)) for i in range(1,6)],snapshot()]);ret(0,20)
 elif address==stop+0x500:calls.append(['draw',receiver,*[signed(read(sp+i*4)) for i in range(1,5)],snapshot()]);ret(0,16)
 elif address==stop+0x600:calls.append(['present',receiver,snapshot()]);ret()
 elif address==stop+0x700:
  descriptor=read(sp+20)
  if stack<=descriptor<stack+0x10000:
   values=[read(descriptor+i*4) for i in range(6)];values[1]=cstring(values[1]);calls.append(['fontGroup',receiver,*[read(sp+i*4) for i in range(1,5)],values,snapshot()])
   if values[0]==5:write(owner+0xa00c,0x12345678)
  else:calls.append(['group',receiver,*[read(sp+i*4) for i in range(1,6)],snapshot()])
  ret(0,20)
 elif address==stop+0x800:calls.append(['sprite',receiver,*[read(sp+i*4) for i in range(1,5)],cstring(read(sp+20)),read(sp+24),snapshot()]);ret(0,24)
 elif address==stop+0x900:calls.append(['commit',receiver,read(sp+4),snapshot()]);ret(0,4)
 elif address==stop+0xa00:calls.append(['createPalette',receiver,read(sp+4),read(sp+8),snapshot()]);ret(0,8)
 elif address==stop+0xb00:calls.append(['font',receiver,*[read(sp+i*4) for i in range(1,5)],cstring(read(sp+20)),snapshot()]);ret(0,20)
 elif address==0x492510:calls.append(['arrayFree',read(sp+4),snapshot()]);ret()
 elif address==stop+0xc00:calls.append(['bind',receiver,*[read(sp+i*4) for i in range(1,4)],snapshot()]);ret(0,12)
 elif address==stop+0xd00:
  file,offset,origin=[read(sp+i*4) for i in range(1,4)];calls.append(['seek',file,offset,origin,snapshot()]);archive_cursors[file-0x5000]=offset;ret(0)
 elif address==stop+0xe00:
  path=read(sp+4);path=path if path==owner+0x311e48 else cstring(path)
  calls.append(['open',path,'rb',snapshot()]);ret(0x1234 if isinstance(path,int) else 0x5000+archives)
 elif address==stop+0xf00:calls.append(['close',read(sp+4),snapshot()]);ret()
 elif address==stop+0x1000:calls.append(['tell',read(sp+4),snapshot()]);ret(cursor)
 elif address==stop+0x1100:
  dest,n,count_,file=[read(sp+i*4) for i in range(1,5)];calls.append(['read','scratch' if stack<=dest<stack+0x10000 else dest,n,count_,file,snapshot()])
  if file==0x1234:chunk=stream[cursor:cursor+n*count_];cursor+=len(chunk)
  else:
   index=file-0x5000;position=archive_cursors[index];chunk=archive_data[index][position:position+n*count_];archive_cursors[index]+=len(chunk)
  if chunk:cpu.mem_write(dest,chunk)
  ret(len(chunk)//n if n else 0)
 elif address==stop+0x1200:ret(0 if bytes(cpu.mem_read(read(sp+4),4))==bytes(cpu.mem_read(read(sp+8),4)) else 1)
for iat,target in [(0x5178f4,stop+0x200),(0x5178ec,stop+0xd00),(0x51794c,stop+0xe00),(0x51793c,stop+0xf00),(0x517940,stop+0x1000),(0x517930,stop+0x1100),(0x51796c,stop+0x1200)]:write(iat,target)
for a in [0x492550,0x4924d0,0x492590,0x492710,0x492510,0x491fa0,*[stop+i*0x100 for i in range(1,19)]]:cpu.hook_add(UC_HOOK_CODE,hook,begin=a,end=a)
cases=[]
for pattern,count in [(0,0),(0xa5,1)]:
 calls=[];allocated=0;pixels=owner+0x100000;headers=owner+0x400000;archives=-1;graphics_archive=0;cursor=0;archive_cursors=[0,0,0]
 stream=bytes.fromhex(next(c['stream'] for c in terrain_cases if c['pattern']==pattern and c['variant']==0 and c['count']==count))
 cpu.mem_write(owner,bytes([pattern])*0x800000);cpu.mem_write(stack,bytes([pattern])*0x10000)
 cpu.mem_write(0x714be0,bytes([pattern])*0x10000);cpu.mem_write(0x560230,bytes([pattern])*4);cpu.mem_write(0x7d6058,bytes([pattern])*256)
 for i,source in enumerate(sources):
  at=owner+0x20000+i*0x2000;cpu.mem_write(at,bytes(source['pixels']))
  for offset,v in [(0,0x5249b0),(4,1),(8,at),(12,8),(16,60),(20,60),(24,60),(28,0),(32,0),(36,60),(40,60)]:write(owner+0x10000+i*0x40+offset,v)
 cpu.mem_write(owner+0x60000,bytes(mask['pixels']))
 for offset,v in [(0,0x5249b0),(4,1),(8,owner+0x60000),(12,8),(16,512),(20,512),(24,64),(28,0),(32,0),(36,512),(40,64)]:write(owner+0x9000+offset,v)
 for offset,v in [(0,owner+0x6400),(0x6404,stop+0x700),(0x6000,owner+0x6100),(0x6114,stop+0x100),(0x6110,stop+0xa00),(0x6104,stop+0x300),(0x6144,stop+0x400),(0x6148,stop+0x500),(0x6160,stop+0x600),(0x6170,stop+0x800),(0x6178,stop+0xb00),(0x6180,stop+0xc00),(0x6154,stop+0x900),(0x2b4,owner+0x6000)]:write(owner+offset,v)
 for offset,v in [(0,0x5249b0),(4,1),(8,owner+0x9200),(12,8),(16,4),(20,1),(24,1),(28,0),(32,0),(36,1),(40,1)]:write(owner+0x9100+offset,v)
 cpu.mem_write(owner+0x9200,b'\x03')
 for bank in [1,2]:
  at=owner+(0xa000 if bank==1 else 0xb000)
  write(at+4,1);write(at+8,254);cpu.mem_write(at+0x90e,struct.pack('<H',8));cpu.mem_write(at+0x70c,struct.pack('<H',247))
  for i in range(247):cpu.mem_write(at+0x70e+i*2,struct.pack('<H',254-i))
  for i in range(8):
   cpu.mem_write(at+0x910+i*2,struct.pack('<H',i));cpu.mem_write(at+0x60c+i,b'\x01')
   for c,m in enumerate([43,71,97] if bank==1 else [17,53,91]):cpu.mem_write(at+12+i*6+c*2,struct.pack('<H',(i*m+bank*20)&255))
 frontend=owner+0x350000;cpu.mem_write(frontend,bytes(0xdc64));cpu.mem_write(frontend+0xde,bytes([count]))
 colors=bytes(((i//3)*[43,71,97][i%3])&255 for i in range(768))
 cpu.mem_write(frontend+0x48a4-0x47a8,colors);cpu.mem_write(frontend+0x4ba4-0x47a8,bytes((i//24+i%24)%12 for i in range(768)))
 cpu.mem_write(frontend+0x4ea4-0x47a8,colors);cpu.mem_write(frontend+0x51a4-0x47a8,bytes((i//20+i%20)%12 for i in range(340)))
 sp=stack+0x8d30;write(sp,stop)
 bindings=[owner+0x6000,0,1,2,3,4,0,5]
 for i,v in enumerate([*bindings,frontend]):write(sp+4+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4a5350,stop,count=200000000)
 assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(pattern=pattern,count=count,stream=stream.hex(),calls=calls,sha256=snapshot()))
args.output.write_text(json.dumps(dict(graphics_source=dict(sha256=hashlib.sha256(graphics_data).hexdigest(),header=graphics_data[:12].hex(),offset=graphics_offset,index=graphics_data[graphics_offset:].hex()),executable_sha256=digest,entry='004A5350',method='Two complete original offline startup executions now compose the full native terrain constructor,including terrain file and real snow/water directory decoding,soil/grass images,crater/tool masks and collision ownership,alongside all context,graphics,palette,font,arrow,spawn,HUD and custom-team stages. Full8MiB owner memory plus spawn scratch,parent temporary palette,packed buffer,archive signature and normalized lookup name match at every external callback and completion. External heap,CRT transport,graphics archive opening,named graphics images,renderer/resource groups/event pump and sprintf remain interfaces. Graphics archive construction,opening,directory decoding and pointer relocation now also execute natively against the real installed Gfx.dir directory. Live browser startup remains unfinished.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} complete scene resource startup sequences')
