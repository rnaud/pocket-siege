"""Execute original replay task factory dispatch."""
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

schemas=json.loads(Path('src/armageddon/replay-task-types.json').read_text())
byTag={row['tag']:row for row in schemas};constructors={int(row['constructor'],16):row for row in schemas}
stream=owner+0x1000;buffer=owner+0x2000
write(stream+4,buffer)
calls=[];allocation=0;mode=0;lastHandle=0

def ret(value=0,cleanup=0):
 sp=cpu.reg_read(UC_X86_REG_ESP);target=read(sp);cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,target);cpu.reg_write(UC_X86_REG_EAX,value)
def hook(cpu,address,size,user):
 global allocation,lastHandle
 if address==stop:cpu.emu_stop();return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 if address==0x492550:
  success=mode==0 or (mode==2 and allocation%2==0)
  lastHandle=owner+0x4000+allocation*0x100 if success else 0
  calls.append(['allocate',read(sp+4),allocation if success else None]);allocation+=1;ret(lastHandle)
 elif address in constructors:
  calls.append(['construct',constructors[address]['tag'],allocation-1,read(sp+4)==owner,read(sp+8)==stream])
  write(stream+0x10,read(stream+0x10)+2) # explicit two-byte constructor payload
  ret(lastHandle,8)
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
sequences=[[tag] for tag in range(256)]+[[row['tag'] for row in schemas],[7,8,6,9],[7,9,18,31,0]]
for tags in sequences:
 for mode in [0,1,2]:
  payload=[];attempt=0
  for tag in tags:
   payload.append(tag)
   if tag==0 or tag not in byTag:break
   if mode==0 or (mode==2 and attempt%2==0):payload.extend([0xa1,0xb2])
   attempt+=1
  payload.append(0)
  cpu.mem_write(buffer,bytes(payload));write(stream+0x10,0);write(stream+0xc,len(payload));calls.clear();allocation=0
  sp=stack+0xf000;write(sp,stop);write(sp+4,stream);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
  cpu.emu_start(0x4b2230,stop+1,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('factory did not exit')
  cases.append({'input':{'bytes':payload,'mode':mode},'result':{'returned':cpu.reg_read(UC_X86_REG_EAX),'position':read(stream+0x10),'calls':list(calls)}})
args.output.write_text(json.dumps({'executable_sha256':digest,'method':'Full004B2230 for every byte tag plus mixed sequences. Original tag dispatch and stream reads unchanged; allocation and concrete constructor interfaces captured. Constructors consume explicit two-byte payloads.','cases':cases},separators=(',',':'))+'\n')
print(f'Captured {len(cases)} original replay factory cases')
