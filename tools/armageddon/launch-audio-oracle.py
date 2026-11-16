"""Execute original004FABA9..004FADDB launch sound and casing selection."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_EBP
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

record=owner+0x2000
write(owner+0x354,record)
hooks={0x4edc90:('sound',20),0x4dd610:('loopSound',16),0x4dd670:('stopLoop',0),0x4edaf0:('voice',8)}
def hook(cpu,address,size,user):
 if address not in hooks:return
 name,cleanup=hooks[address];sp=cpu.reg_read(UC_X86_REG_ESP);args=[read(sp+4+i*4) for i in range(cleanup//4)]
 calls.append(dict(operation=name,request=args))
 if name=='voice':cpu.reg_write(UC_X86_REG_EAX,1000+args[1])
 cpu.reg_write(UC_X86_REG_ESP,sp+4+cleanup);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
schemes=json.loads((Path(__file__).resolve().parents[2]/'src/armageddon/scheme-weapon-data.json').read_text())
weapons=next(s for s in schemes['schemes'] if s['resource_id']==195)['weapons']
records={i:{hex(0x48+j*4):v for j,v in enumerate(words)} for i,words in enumerate(weapons)}
cases=[]
for identity,fields in records.items():
 for loop in [0,1]:
  for burst in [0,1,2]:
   for ordinal in [0,1,2]:
    for offset,value in fields.items():write(record+int(offset,16),value&0xffffffff)
    body=dict(loop=loop,burst=burst,ordinal=ordinal,flag=loop,team=2)
    for key,off in [('loop',0x388),('burst',0x2e0),('ordinal',0x2dc),('flag',0x210),('team',0xfc)]:write(owner+off,body[key])
    cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBP,burst);cpu.reg_write(UC_X86_REG_EBX,0);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    calls=[];cpu.emu_start(0x4faba9,0x4faddb,count=1000)
    if cpu.reg_read(UC_X86_REG_EIP)!=0x4faddb:raise RuntimeError('Sound selection did not finish')
    cases.append(dict(weapon=int(identity),fields={key:fields[key] for key in ['0x68','0x6c','0x70','0x78']},body=body,calls=calls,casing=cpu.reg_read(UC_X86_REG_EBX)))
args.output.write_text(json.dumps(dict(executable_sha256=digest,method='Original004FABA9..004FADDB with sound/voice interfaces captured; all71 complete default scheme195 weapon records, loop/burst/ordinal states. Stops before casing emission.',cases=cases),separators=(',',':'))+'\n')
print(f'Captured {len(cases)} launch sound cases')
