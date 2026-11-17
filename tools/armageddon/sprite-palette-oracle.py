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

sprite_object=owner+0x3000
source=0x2400000
cpu.mem_map(source,0x400000)
def hook(cpu,address,size,user):
 if address==0x492550:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  cpu.reg_write(UC_X86_REG_EAX,0) # unused bitmap wrapper allocation only
  cpu.reg_write(UC_X86_REG_EIP,read(sp));cpu.reg_write(UC_X86_REG_ESP,sp+4)
cpu.hook_add(UC_HOOK_CODE,hook)
def call(entry,values,receiver):
 sp=stack+0xf000
 for i,v in enumerate([stop]+values):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ECX,receiver);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(entry,stop,count=10000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Sprite loader did not return')
 return signed(cpu.reg_read(UC_X86_REG_EAX))
def short(address):return struct.unpack('<h',cpu.mem_read(address,2))[0]
root=Path(__file__).resolve().parents[2]
cases=[]
for table,directory,first,last,black in [
 ('sprite-ids','sprites',0,104,True),
 ('water-sprite-ids','media/water/blue/water',105,136,False)]:
 cpu.mem_write(owner,bytes(0x10000));call(0x4adac0,[first,last],owner)
 if black:
  cpu.mem_write(owner+0x2000,bytes(6));call(0x4adcb0,[owner+0x2000],owner)
 sprites=json.loads((root/f'src/armageddon/{table}.json').read_text())['sprites']
 rows=[]
 for key,item in sprites.items():
  name=item['name'];path=f'public/armageddon/{directory}/{name}.spr';raw=(root/path).read_bytes()
  cpu.mem_write(source,raw);cpu.mem_write(sprite_object,bytes(0x100))
  result=call(0x4af790,[owner,source],sprite_object)
  count=struct.unpack_from('<H',raw,10)[0]
  mapping=list(cpu.mem_read(read(sprite_object+0x2c),count+1))
  rows.append({'id':int(key),'name':name,'path':path,'sha256':hashlib.sha256(raw).hexdigest(),'mapping':mapping,'result':result})
 used=[short(owner+0x910+i*2) for i in range(short(owner+0x90e))]
 entries=[[index,list(struct.unpack('<3h',cpu.mem_read(owner+0xc+index*6,6)))] for index in used]
 cases.append({'first':first,'last':last,'black':black,'sprites':rows,'entries':entries})
args.output.write_text(json.dumps({'executable_sha256':digest,'entry':'004AF790',
 'method':'Full original sprite loader executes for both original sprite tables in table order, with real palette add and raw pixel translation. Only unused bitmap-wrapper allocation returns null. Each bank starts at its recovered range; unrelated team/font allocations are excluded.',
 'cases':cases},separators=(',',':'))+'\n')
print(f'Captured {sum(len(c["sprites"]) for c in cases)} original sprite loads')
