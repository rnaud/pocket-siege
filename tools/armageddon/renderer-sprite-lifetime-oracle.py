"""Execute original renderer sprite lifetime through cached drawing and registry removal."""
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
sprite=owner+0x3000;bitmap=owner+0x4000;buffer=owner+0x8000
cpu.mem_map(owner+0x10000,0x50000)
def snapshot():return hashlib.sha256(bytes(cpu.mem_read(owner,0x60000))+bytes(cpu.mem_read(source,len(raw)))+bytes(cpu.mem_read(0x5602e4,16))+bytes(cpu.mem_read(0x7d54e8,8))).hexdigest()
def hook(cpu,address,size,user):
 if address in [0x492590,0x492510]:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  events.append(['freeSized' if address==0x492590 else 'freeArray',read(sp+4),read(sp+8) if address==0x492590 else 0,snapshot()])
  if pattern and address==0x492590 and read(sp+8)==44:write(renderer+0x864+7*4,2)
  cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
 elif address==0x492550:
  sp=cpu.reg_read(UC_X86_REG_ESP);cpu.reg_write(UC_X86_REG_EAX,bitmap);cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
cpu.hook_add(UC_HOOK_CODE,hook,begin=0x492550,end=0x492550)
for address in [0x492590,0x492510]:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
root=Path(__file__).resolve().parents[2];cases=[]
for path in ['public/armageddon/sprites/phone.spr','public/armageddon/sprites/cdrom.spr',None]:
 raw=(root/path).read_bytes() if path else bytes.fromhex(next(c['raw'] for c in json.loads((root/'tests/fixtures/armageddon/sprite-memory.json').read_text())['cases'] if not c['path']))
 for pattern in [0,165]:
  for capacity in [32000,65536]:
   for last in [2,254]:
    cpu.mem_write(owner,bytes([pattern])*0x60000);cpu.mem_write(source,raw)
    cpu.mem_write(0x5602e4,struct.pack('<4I',0xfffffff0,17,0xfffffff0,23));cpu.mem_write(0x7d54e8,struct.pack('<2I',0xfffffff0,123))
    write(0x55e3c4,buffer);write(buffer,0x5266a0);write(buffer+4,owner+0x10000);write(buffer+8,capacity)
    for offset in [12,16,20,24,28]:write(buffer+offset,0)
    for offset,value in [(0,0x5249b0),(4,1),(8,owner+0x20000),(12,8),(16,192),(20,192),(24,192),(28,5),(32,3),(36,123),(40,189)]:write(owner+0x6000+offset,value)
    renderer=owner+0x40000
    for offset,value in [(20,5),(24,3),(28,123),(32,189),(36,96),(40,96),(0x30,3),(0x454,1),(0x458,owner+0x6000),(0x460,owner+0x7000),(0x14b2c,0),(0x2864+7*4,sprite),(0x38e4+7*4,0),(0x864+7*4,1),(0x1864+7*4,2),(0x4b08,1),(0x4b0c,0)]:write(renderer+offset,value)
    for offset,value in [(0,0x5249b0),(4,1),(8,owner+0x30000),(12,8),(16,192),(20,192),(24,192),(28,0),(32,0),(36,192),(40,192)]:write(owner+0x7000+offset,value)
    cpu.mem_write(renderer+0x4b2c,bytes((s*3+d*5)&255 for d in range(256) for s in range(256)))
    call(0x4adac0,[1,last],owner);call(0x4af5c0,[0x497b20,0x497ba0],sprite);call(0x4af790,[owner,source,0],sprite)
    initial=snapshot();steps=[]
    for progress,flags in zip([0,0,1000,32768,65535,0,65535,32768,0],[0,0x10000,0x40000,0x1000000,0x4000000,0x5000000,0x1040000,0x4050000,0]):
     call(0x498890,[4<<16,3<<16,7|flags,progress],renderer)
     steps.append(dict(progress=progress,encoded=7|flags,state=snapshot()))
    events=[]
    removed=call(0x497c00,[7],renderer);removed_state=snapshot()
    missing=call(0x497c00,[7],renderer)
    cases.append(dict(dispatch=True,cleanup=True,events=events,removed=removed,removed_state=removed_state,missing=missing,final=snapshot(),path=path,raw=None if path else raw.hex(),sha256=hashlib.sha256(raw).hexdigest(),pattern=pattern,capacity=capacity,last=last,initial=initial,steps=steps))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='00498890/00497C00/004AF600/00497BA0',method='Original SPR parsing and complete sprite dispatch execute unchanged, including shared cache eviction, lazy compressed decoding, palette remapping, tint scratch drawing, blending, reflection and tiling. Parser bitmap allocation and final heap frees are explicit services. Original registry removal, bitmap/sprite destruction and cache membership callbacks execute unchanged after drawing, including a free callback replacing the bank index. Full memory matches at each free and after repeated removal. Full384KiB owner memory, owned source and resource/cache counters match after each draw. Blend spans are clipped below the original unrolled128-pixel kernel limit (full160-pixel CD-ROM blending is not a valid native call). Target is already locked and blend table prepared; backend target locking and dirty table generation are independently verified.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} sprite bitmap/cache sequences')
