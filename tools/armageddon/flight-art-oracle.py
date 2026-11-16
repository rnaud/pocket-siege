"""Execute original flight art instructions in Unicorn.

Animation interface calls are recorded with their real calling convention. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EAX, UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP
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
angles=[]
values=[-0x200000,-0x10000,-100,-5,-1,0,1,5,100,0x10000,0x200000]
for x in values:
 for y in values:
  for offset,value in [(0,stop),(4,x&0xffffffff),(8,y&0xffffffff)]:write(stack+0xff00+offset,value)
  cpu.reg_write(UC_X86_REG_ESP,stack+0xff00);cpu.emu_start(0x49c030,stop,count=5000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Angle did not return')
  angles.append({'x':x,'y':y,'angle':cpu.reg_read(UC_X86_REG_EAX)})
poses=[]
for x in [-1000000,-81,-40,-21,-20,-1,0,1,19,20,39,40,59,60,79,80,120,1000000]:
 for y in [-650,0,696]:
  write(owner+0x4000,13);write(owner+0x4004,(x*65536)&0xffffffff);write(owner+0x4008,(y*65536)&0xffffffff)
  write(stack+0xff00+0x1c,owner+0x4008)
  cpu.reg_write(UC_X86_REG_ESP,stack+0xff00);cpu.reg_write(UC_X86_REG_ESI,owner+0x4000);cpu.reg_write(UC_X86_REG_EBX,owner+0x4004)
  cpu.emu_start(0x4db8e4,0x4db915,count=100)
  poses.append({'x':(x*65536)&0xffffffff,'y':(y*65536)&0xffffffff,'sprite':read(owner+0x4000)})
animator,vtable,progress_call=owner+0x800,owner+0x3000,owner+0x5000
write(owner+0x350,animator);write(animator,vtable);write(vtable+0x10,progress_call)
cpu.mem_write(progress_call,b'\xc2\x04\x00')
captured={}
def observe(cpu,address,size,unused):
 if address==progress_call:captured['progress']=struct.unpack('<i',cpu.mem_read(cpu.reg_read(UC_X86_REG_ESP)+4,4))[0]
cpu.hook_add(UC_HOOK_CODE,observe,begin=progress_call,end=progress_call)
progress_cases=[]
for row in angles:
 vx,vy=row['x'],row['y']
 if vx==0 and vy==0:continue
 write(stack+0xfe00+0x30,vx&0xffffffff);write(stack+0xfe00+0x2c,vy&0xffffffff)
 cpu.reg_write(UC_X86_REG_ESP,stack+0xfe00);cpu.reg_write(UC_X86_REG_EDI,owner)
 cpu.emu_start(0x4dec71,0x4decc5,count=5000)
 if cpu.reg_read(UC_X86_REG_EIP)!=0x4decc5:raise RuntimeError('Flight progress did not finish')
 progress_cases.append({'vx':vx,'vy':vy,'progress':captured['progress']})
args.output.write_text(json.dumps({'executable_sha256':digest,'angle_entry':'0049C030','pose_block':'004DB8E4–004DB915','angles':angles,'poses':poses,'progress_block':'004DEC71–004DECC5','progress_cases':progress_cases},indent=2)+'\n')
print(f'Captured {len(angles)} angles and {len(poses)} flight poses')
