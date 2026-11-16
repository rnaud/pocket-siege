"""Execute jump launch state branch 004DEA1C..004DEB81.

Original trig, fixed arithmetic and body impulse 004F4CB0 execute unchanged.
The target-state call is observed, not executed. No game entry point runs.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE, UC_HOOK_INTR
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EDI, UC_X86_REG_EBP
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

vtable,transition=owner+0x1000,owner+0x1200
write(vtable+0x118,0x4f4cb0);write(vtable+0x80,transition)
cpu.mem_write(transition,b'\xc2\x04\x00')
impulse,target=None,None
def observe(cpu,address,size,user):
    global impulse,target
    sp=cpu.reg_read(UC_X86_REG_ESP)
    if address==0x4f4cb0:impulse=list(struct.unpack('<3i',cpu.mem_read(sp+4,12)))
    elif address==transition:target=read(sp+4)
cpu.hook_add(UC_HOOK_CODE,observe)
fields={'vx':0x9c,'vy':0xa0,'angularVelocity':0xa4,'mass':0x58,'suspended':0x54}
profiles=[{'vx':0,'vy':0,'angularVelocity':0,'mass':65536,'suspended':0},
          {'vx':-12345,'vy':54321,'angularVelocity':987,'mass':32768,'suspended':0},
          {'vx':0x7fffffff,'vy':-0x80000000,'angularVelocity':-37,'mass':131072,'suspended':0},
          {'vx':123,'vy':-456,'angularVelocity':789,'mass':0,'suspended':1}]
fault=False
def arithmetic_fault(cpu,number,user):
    global fault
    if number != 0 or cpu.reg_read(UC_X86_REG_EIP) != 0x4ae093:raise RuntimeError(f'Unexpected native interrupt {number} at {cpu.reg_read(UC_X86_REG_EIP):x}')
    fault=True
    cpu.reg_write(UC_X86_REG_EIP,0x4ded66)
    cpu.emu_stop()
cpu.hook_add(UC_HOOK_INTR,arithmetic_fault)
# Unicorn retains pending exception state after #DE; use a fresh CPU after
# each trapped vector so the next vector cannot become an artificial #DF.
image_size=(struct.unpack_from('<I',data,optional+56)[0]+0xfff)&~0xfff
image=bytes(cpu.mem_read(base,image_size))
def fresh_cpu():
    machine=Uc(UC_ARCH_X86,UC_MODE_32)
    machine.mem_map(base,image_size);machine.mem_write(base,image)
    for address in [owner,stack,stop]:machine.mem_map(address,0x10000)
    machine.mem_write(vtable+0x118,struct.pack('<I',0x4f4cb0))
    machine.mem_write(vtable+0x80,struct.pack('<I',transition))
    machine.mem_write(transition,b'\xc2\x04\x00')
    machine.hook_add(UC_HOOK_CODE,observe);machine.hook_add(UC_HOOK_INTR,arithmetic_fault)
    return machine
cases=[]
for progress in [-0x80000000,-1,0,65535,65536,65537,0x7fffffff]:
    for direction in [-7,-1,0,1,7]:
        for backflip in [0,1,-1]:
            for facing in [-1,0,1,0x7fffffff]:
                for body in profiles:
                    for name,offset in fields.items():write(owner+offset,body[name]&0xffffffff)
                    write(owner+0x2b0,direction&0xffffffff);write(owner+0x2b4,backflip&0xffffffff);write(owner+0x1b0,facing&0xffffffff)
                    sp=stack+0xf000;write(sp+0x24,progress&0xffffffff)
                    for reg,value in [(UC_X86_REG_ESP,sp),(UC_X86_REG_EDI,owner),(UC_X86_REG_ESI,vtable)]:cpu.reg_write(reg,value)
                    impulse,target=None,None
                    fault=False
                    cpu.emu_start(0x4dea1c,0x4ded66,count=10000)
                    if fault:
                        cases.append({'progress':progress,'direction':direction,'backflip':backflip,'facing':facing,'body':body,'error':'fixed_divide_overflow'})
                        cpu=fresh_cpu()
                        continue
                    if cpu.reg_read(UC_X86_REG_EIP)!=0x4ded66:raise RuntimeError('Jump branch did not reach boundary')
                    result={name:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for name,offset in fields.items()}
                    cases.append({'progress':progress,'direction':direction,'backflip':backflip,'facing':facing,'body':body,'result':{'impulse':impulse,'target':target,'body':result,'accepted':None if impulse is None else int(not body['suspended'])}})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004DEA1C..004DEB81','method':__doc__,'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} jump launch cases')
