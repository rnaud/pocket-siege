"""Execute original in-game palette allocation, reads and enumeration."""
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
owner, stack, stop = 0x2000000, 0x2100000, 0x2200000
for address in [owner, stack, stop]: cpu.mem_map(address,0x10000)
def write(address,value): cpu.mem_write(address,struct.pack('<I',value&0xffffffff))
def read(address): return struct.unpack('<I',cpu.mem_read(address,4))[0]
def signed(v):return v if v<0x80000000 else v-0x100000000

rgb=owner+0x2000;output=owner+0x2100;indexOut=owner+0x2200

def call(entry,args):
 sp=stack+0xf000
 for i,v in enumerate([stop]+args):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Palette helper did not return')
 return signed(cpu.reg_read(UC_X86_REG_EAX))
def short(a):return struct.unpack('<h',cpu.mem_read(a,2))[0]
requests=[[0,0,0],[0,0,0],[255,128,64],[255,128,64],[-1,32767,-32768],[1,2,3],[4,5,6],[7,8,9],[0,0,0]]
cases=[]
for first,last in [(0,0),(0,3),(1,3),(1,105),(106,137),(138,249)]:
 cpu.mem_write(owner,bytes(0x1000));call(0x4adac0,[first,last]);steps=[]
 for color in requests:
  cpu.mem_write(rgb,struct.pack('<3h',*color));value=call(0x4adcb0,[rgb]);steps.append({'color':color,'value':value})
 reads=[]
 for index in sorted(set([0,first-1,first,first+1,last,last+1])):
  success=call(0x4adc60,[output,index]);reads.append({'index':index,'color':list(struct.unpack('<3h',cpu.mem_read(output,6))) if success else None})
 entries=[]
 while call(0x4adf60,[indexOut,output]):entries.append([signed(read(indexOut)),list(struct.unpack('<3h',cpu.mem_read(output,6)))])
 cases.append({'first':first,'last':last,'steps':steps,'reads':reads,'entries':entries,'free':[short(owner+0x70e+i*2) for i in range(short(owner+0x70c))],'dirty':bool(read(owner+0xb10))})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004ADAC0/004ADCB0/004ADC60/004ADF60','method':'All four routines execute unchanged without hooks; tests allocation exhaustion, exact RGB reuse, zero-index exception, range/dirty reads and enumeration order.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} complete palette lifecycles')
