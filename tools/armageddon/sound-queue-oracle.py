"""Execute the original sound queue insertion and frame-drain instructions.

Runs full 004EDC90 and drain block 004A1C22..004A1CBB; backend calls are captured.
"""
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

context = 0x2300000
cpu.mem_map(context, 0x20000)
write(owner+0x38,context); write(owner+0x2a0,context)
backend,vtable,submit=owner+0x1000,owner+0x2000,stop+0x100
write(backend,vtable);write(vtable+12,submit)
cpu.mem_write(submit,b'\xc2\x14\x00')
calls=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 calls.append(list(struct.unpack('<5i',cpu.mem_read(sp+4,20))))
cpu.hook_add(UC_HOOK_CODE,capture,begin=submit,end=submit)
cases=[]
for count in [0,1,15,16,17,32]:
 for disabled in [0,1]:
  for present in [0,1]:
   write(context+0x1cad4,0)
   inputs=[];accepted=[]
   for i in range(count):
    request=[i+100,(i*7)%10,65536+i,32768-i,-65536+i]
    inputs.append(request);sp=stack+0xf000
    for j,value in enumerate([stop,*request]):write(sp+j*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4edc90,stop,count=1000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    accepted.append(cpu.reg_read(UC_X86_REG_EAX))
   stored=[list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+i*20,20))) for i in range(read(context+0x1cad4))]
   write(context+0x1d448,disabled);write(context+12,backend if present else 0)
   calls=[]
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBX,0);cpu.reg_write(UC_X86_REG_ESP,stack+0xe000)
   cpu.emu_start(0x4a1c22,0x4a1cbb,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a1cbb
   cases.append(dict(inputs=inputs,accepted=accepted,stored=stored,disabled=disabled,present=present,calls=calls,remaining=read(context+0x1cad4)))

# Full 004967E0, with DirectSound Stop/Release calls captured at the boundary.
stop_buffer,release_buffer=stop+0x200,stop+0x204
cpu.mem_write(stop_buffer,b'\xc2\x04\x00');cpu.mem_write(release_buffer,b'\xc2\x04\x00')
channel_vtable=owner+0x3000
write(channel_vtable+0x48,stop_buffer);write(channel_vtable+8,release_buffer)
channel_calls=[]
def capture_channel(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 channel_calls.append(['stop' if address==stop_buffer else 'release',(read(sp+4)-(owner+0x4000))//0x100])
cpu.hook_add(UC_HOOK_CODE,capture_channel,begin=stop_buffer,end=release_buffer)
channel_cases=[]
layouts=[[None]*8,[3]*8,[8]*8,[1,2,3,4,5,6,7,8],[8,7,6,5,4,3,2,1],[3,1,3,1,3,1,3,1],[-1,0,-1,0,-1,0,-1,0],[2147483647]*8]
layouts += [[3 if j!=i else None for j in range(8)] for i in range(8)]
for priorities in layouts:
 for incoming in [-2147483648,-1,0,1,3,8,2147483647]:
  for tracked in [False,True]:
   for i,priority in enumerate(priorities):
    buffer=owner+0x4000+i*0x100;write(buffer,channel_vtable)
    write(owner+0x28+i*24,buffer if priority is not None else 0)
    write(owner+0x1c+i*24,(priority or 0)&0xffffffff)
    write(owner+0x18+i*24,i if tracked else 0xffffffff)
    write(owner+0x8a8+i*4,i)
   channel_calls=[];sp=stack+0xf000
   write(sp,stop);write(sp+4,incoming&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4967e0,stop,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   result=cpu.reg_read(UC_X86_REG_EAX);result=result if result<0x80000000 else result-0x100000000
   channel_cases.append(dict(priorities=priorities,incoming=incoming,tracked=tracked,result=result,calls=channel_calls,
    occupied=[bool(read(owner+0x28+i*24)) for i in range(8)],handles=[read(owner+0x8a8+i*4) for i in range(8)]))
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases,channelCases=channel_cases),separators=(',',':'))+'\n')
print(f'Wrote {len(cases)} queue and {len(channel_cases)} channel cases')
