"""Execute weapon delay advancement and unlock presentation against the original executable."""
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

context=0x2300000;cpu.mem_map(context,0x20000)
language=owner+0x2000;vtable=owner+0x2100;templates=owner+0x2200
interfaces=[(0x4c3050,2),(0x4c3080,3),(0x4ee960,0),(0x4eefb0,2),(0x4edaf0,2),(0x4edc50,5),(stop+0x100,0),(stop+0x200,0)]
for address,argc in interfaces:cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
write(0x5178f4,stop+0x200)
def signed(a):return struct.unpack('<i',cpu.mem_read(a,4))[0]
def string(a):return bytes(cpu.mem_read(a,128)).split(b'\0')[0].decode()
def hook(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x4c3050:
  slot=read(sp+8);calls.append(['delay',signed(sp+4),slot]);cpu.reg_write(UC_X86_REG_EAX,delays[slot-1]&0xffffffff)
 elif address==0x4c3080:
  slot=read(sp+8);value=signed(sp+12);calls.append(['set',signed(sp+4),slot,value]);delays[slot-1]=value
 elif address==stop+0x100:calls.append(['templates']);cpu.reg_write(UC_X86_REG_EAX,templates)
 elif address==0x4ee960:calls.append(['random']);cpu.reg_write(UC_X86_REG_EAX,rng&0xffffffff)
 elif address==stop+0x200:
  template=string(read(sp+8));name=string(read(sp+12));calls.append(['format',template,team]);cpu.mem_write(read(sp+4),template.replace('%s',name).encode()+b'\0')
 elif address==0x4eefb0:calls.append(['announce',signed(sp+4),string(read(sp+8))])
 elif address==0x4edaf0:calls.append(['teamSound',signed(sp+4),signed(sp+8)]);cpu.reg_write(UC_X86_REG_EAX,123)
 elif address==0x4edc50:calls.append(['sound']+[signed(sp+4+4*i) for i in range(5)])
for address,_ in interfaces:cpu.hook_add(UC_HOOK_CODE,hook,begin=address,end=address)
cases=[]
for case in range(64):
 cpu.mem_write(owner,bytes(0x4000));cpu.mem_write(context,bytes(0x20000));write(owner+0x38,context)
 team=case%6;priority=2147483647 if case&32 else 3;dirty=case%3
 for o,v in [(0x3c,team),(0x54,priority),(0xc8,dirty)]:write(owner+o,v)
 values=[0,-1,2,2147483647,1];delays=[values[(slot+case)%5] for slot in range(70)]
 if case%4==0:delays=[0]*70
 if case%4==1:delays=[-1]*70;delays[0]=1
 if case%4==2:delays=[2]*70;delays[69]=1
 initial=delays[:];rng=[0,1,255,256,-1,0x12345678][case%6];texts=['%s unlock'+str(i) for i in range(1+case%5)]
 write(context+0x1c,language);write(language,vtable);write(vtable+0x18,stop+0x100)
 cpu.mem_write(context+0x3cd6+team*3000,b'TeamName\0')
 for i,text in enumerate(texts):
  address=owner+0x2400+i*128;write(templates+i*4,address);cpu.mem_write(address,text.encode()+b'\0')
 write(templates+len(texts)*4,0);calls=[];sp=stack+0xf000;write(sp,stop)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner);cpu.emu_start(0x4e6630,stop,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
 cases.append(dict(team=team,priority=priority,dirty=dirty,initial=initial,rng=rng,texts=texts,calls=calls,delays=delays,resultDirty=read(owner+0xc8)))
args.output.write_text(json.dumps(dict(executableSha256=digest,routine='004E6630',cases=cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} weapon delay cases')
