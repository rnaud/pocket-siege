"""Execute original match state initialization and content pool construction."""
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


context=0x2300000;cpu.mem_map(context,0x20000);write(owner+0x2a0,context)
pattern=bytes((i*17+5)&255 for i in range(0x20000));cases=[]
interface=owner+0x800;table=owner+0x1000;callback=owner+0x1800
write(interface,table);write(table+4,callback);cpu.mem_write(callback,b"\xc2\x04\x00")
calls=[]
def hook(cpu,address,size,user):
 if address==callback:
  calls.append(read(cpu.reg_read(UC_X86_REG_ESP)+4)&255)
cpu.hook_add(UC_HOOK_CODE,hook)
for variant in range(288):
 cpu.mem_write(context,pattern)
 words=[[0x24,interface],[0x1474,[0,11,12,15,16,4][variant%6]],[0x1500,[0,15,16][variant%3]],[0x1b18,[0,13,15,16][variant%4]],[0x1920,[0,1,75,99,100][variant%5]],[0x1668,[0,68,70,71][variant%4]],
 [0x1b8b0,[-100,0,25,100,101,2147483647][variant%6]],[0x1b8d4,[-65536,0,700<<16,0x7fffffff][variant%4]],[0x1b8d8,0x12345678],[0x11b98,variant*1234567],[0x20,variant&1],[0x1b8ac,(variant>>1)&1]]
 weights=[[0,0,0],[20,30,50],[100,0,0],[255,255,255],[1,1,1],[70,40,0]][variant%6]
 bytewrites=[[0x11d52,weights[0]],[0x11d53,weights[1]],[0x11d54,weights[2]],[0x11d57,(variant>>2)&1],[0x11d62,(variant>>3)&1],[0x11d68,[0,1,255][variant%3]],[0x11eab,variant&255],[0x11eac,(variant*13)&255]]
 for slot in range(71):words.append([0x1260c+slot*0x208,(slot+variant)%3])
 for offset,value in words:write(context+offset,value)
 for offset,value in bytewrites:cpu.mem_write(context+offset,bytes([value]))
 calls.clear();cpu.reg_write(UC_X86_REG_ESP,stack+0xf000);cpu.reg_write(UC_X86_REG_ESI,owner)
 cpu.emu_start(0x49d47a,0x49db9a,count=100000);assert cpu.reg_read(UC_X86_REG_EIP)==0x49db9a
 cases.append(dict(words=words,bytes=bytewrites,calls=list(calls),sha256=hashlib.sha256(cpu.mem_read(context,0x20000)).hexdigest()))
args.output.write_text(json.dumps(dict(executable_sha256=digest,entry='0049D47A..0049DB9A',method='Original instructions and crate eligibility; mode interface observed with a no-op callback. Complete patterned scene hashes across geometry, signed arithmetic, pool capacity and weight boundaries.',cases=cases),separators=(',',':'))+'\n')
print('Captured',len(cases),'match state initializations')
