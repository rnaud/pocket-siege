"""Execute fresh team controller construction against the original executable."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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
def write(address,value): cpu.mem_write(address,struct.pack('<I',value))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]

context=0x2300000;cpu.mem_map(context,0x20000);configuration=owner+0x2000
interfaces=[(0x4ed970,1),(0x4b19e0,1),(0x492550,0),(0x4d5a40,4),(0x4c31f0,3),(0x4e5380,0),(0x4b2670,2)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def hook(cpu,address,size,user):
 global allocations
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4ed970:calls.append(['base']);write(owner+0x38,context)
 elif address==0x4b19e0:calls.append(['type',read(sp+4)]);write(owner+0x2c,read(sp+4))
 elif address==0x492550:
  result=0 if (allocations+bits)%3==0 else 100+allocations;allocations+=1;calls.append(['allocate',read(sp+4),result]);cpu.reg_write(UC_X86_REG_EAX,result)
 elif address==0x4d5a40:calls.append(['worm',cpu.reg_read(UC_X86_REG_ECX),signed(sp+8),signed(sp+12),list(cpu.mem_read(read(sp+16),40))])
 elif address==0x4c31f0:calls.append(['selected']+[signed(sp+4+4*i) for i in range(3)])
 elif address==0x4e5380:calls.append(['resources']);write(owner+0xe8,0xffffffff)
 elif address==0x4b2670:calls.append(['register',read(sp+4),signed(sp+8)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[];offsets=list(range(0x3c,0x8c,4))+[0xac,0xbc,0xe8]
for bits in range(64):
 cpu.mem_write(owner,bytes([0xa5])*0x120);cpu.mem_write(context,bytes(0x20000));cpu.mem_write(configuration,bytes(0xc00))
 team=bits%6;control=[0,1,127,-1,-128][bits%5];count=[0,1,2,8][bits%4];color=bits*4
 cpu.mem_write(configuration,struct.pack('<b',control));cpu.mem_write(configuration+0xbb4,bytes([count]));cpu.mem_write(context+team*3000+0x3cd1,bytes([color]))
 configs=[]
 for i in range(count):
  record=bytes((i*41+j+bits)%256 for j in range(40));cpu.mem_write(configuration+0xa74+i*40,record);configs.append(list(record))
 calls=[];allocations=0;sp=stack+0xf000
 for i,v in enumerate([stop,0x1234,team,configuration]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e4ed0,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(bits=bits,team=team,control=control,count=count,color=color,configs=configs,calls=calls,body=[signed(owner+o) for o in offsets]))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E4ED0 with base/resource/actor boundaries',offsets=offsets,cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} controller construction cases')
