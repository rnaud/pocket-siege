"""Execute original renderer font registration through archive lookup, parser and cleanup."""
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
owner, stack, stop, source = 0x2000000, 0x2100000, 0x2200000, 0x2400000
for address,length in [(owner,0x10000),(stack,0x10000),(stop,0x1000),(source,0x400000)]:cpu.mem_map(address,length)
def write(address,value):cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address):return struct.unpack('<I',cpu.mem_read(address,4))[0]
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Parser did not return')
 return cpu.reg_read(UC_X86_REG_EAX)
archive=owner+0x5000;vtable=owner+0x5800;name=owner+0x7000;table=owner+0x8000;entry=owner+0x9000
handle=owner+0x6000;bitmap=owner+0x6100;obj=owner+0x3000
renderer=owner+0xa000
normalized=0x7d6058
view,seek,read_bytes=stop+0x100,stop+0x200,stop+0x300
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x10000))+bytes(cpu.mem_read(source,len(raw)))+bytes(cpu.mem_read(0x5602e4,16))+bytes(cpu.mem_read(normalized,256))).hexdigest()
def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EAX,value&0xffffffff)
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP);receiver=cpu.reg_read(UC_X86_REG_ECX)
 if address==view:
  events.append(['view',receiver,read(sp+4),snapshot()]);write(read(sp+8),len(raw));ret(source if mode=='mapped' else 0,8)
 elif address==seek:
  events.append(['seek',receiver,read(sp+4),snapshot()]);ret(1,4)
 elif address==read_bytes:
  dest,n=read(sp+4),read(sp+8);events.append(['read',receiver,dest,n,snapshot()]);cpu.mem_write(dest,raw[:n]);ret(n,8)
 elif address==0x492550:
  n=read(sp+4);events.append(['allocate',n,snapshot()]);ret(obj if n==28 else handle if n==12 else bitmap if allocated else 0)
 elif address==0x4924d0:
  events.append(['array',read(sp+8),read(sp+4),snapshot()]);ret(source)
 elif address==0x492510:
  events.append(['freeArray',read(sp+4),snapshot()]);ret()
 elif address==0x492590:
  events.append(['free',read(sp+4),read(sp+8),snapshot()]);ret()
for address in [view,seek,read_bytes,0x492550,0x4924d0,0x492590,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
root=Path(__file__).resolve().parents[2];cases=[]
for font,path in [(True,'public/armageddon/fonts/smlwht1.fnt')]:
 raw=(root/path).read_bytes();filename=Path(path).name.encode()+b'\0'
 for mode in ['mapped','file','missing']:
  for pattern in [0,165]:
   for allocated in ([True] if font else [False,True]):
    for last in [2,254]:
     for profile in ['valid','duplicate','bank_zero','bank_eight','priority_zero','id_zero','id_32','no_palette']:
      cpu.mem_write(owner,bytes([pattern])*0x10000);cpu.mem_write(source,raw if mode=='mapped' else bytes([pattern])*len(raw));cpu.mem_write(normalized,bytes([pattern])*256)
      cpu.mem_write(0x5602e4,struct.pack('<4I',0xfffffff0,17,0xfffffff0,23))
      write(archive,vtable);write(vtable+4,view);write(vtable+8,read_bytes);write(vtable+12,seek);write(vtable+20,0x4ad780)
      write(archive+4,table);cpu.mem_write(table,bytes(4096));write(archive+0x18c,16);write(archive+0x190,0)
      for i in range(16):write(archive+0x10c+i*4,i);write(archive+12+i*16,0)
      cpu.mem_write(name,filename);write(entry,0);write(entry+4,1234);write(entry+8,len(raw));cpu.mem_write(entry+12,filename)
      h=0
      for b in filename[:-1]:h=(b+((h>>9)|((h*2)&1023)))&1023
      if mode!='missing':write(table+h*4,entry)
      call(0x4adac0,[1,last],owner)
      bank,priority,font_id=1,2,7
      if profile=='bank_zero':bank=0
      if profile=='bank_eight':bank=8
      if profile=='priority_zero':priority=0
      if profile=='id_zero':font_id=0
      if profile=='id_32':font_id=32
      write(renderer+0x4ae8,0 if profile=='no_palette' else owner)
      write(renderer+0x49e4+font_id*4,obj if profile=='duplicate' else 0)
      write(renderer+0x4b08,0xffffffff)
      initial=snapshot();events=[]
      result=call(0x497ca0,[bank,priority,font_id,archive,name],renderer)
      registered=snapshot()
      if result:call(0x4b03b0,[1],obj)
      cases.append(dict(registered=registered,register=True,profile=profile,bank=bank,priority=priority,id=font_id,font=font,path=path,sha256=hashlib.sha256(raw).hexdigest(),mode=mode,pattern=pattern,allocated=allocated,last=last,initial=initial,events=events,result=result,state=snapshot()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00497CA0',method='Original renderer validation/registration, font constructor/destructor, named loader, archive lifecycle, palette allocation and parser execute unchanged. Heap and archive transport/mapped lookup are interfaces. Full owner, source, counters and normalized lookup buffer match at every callback and completion.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} renderer font registration cases')
