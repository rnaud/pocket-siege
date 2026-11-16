"""Capture native FNT parsing and text measurements (004B04B0 / 004B0A80)."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX, UC_X86_REG_ESI, UC_X86_REG_EBP
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('fonts', type=Path)
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

font_data=0x2300000
cpu.mem_map(font_data,0x100000)
color_index=0
def hook(cpu,address,size,user):
 global color_index
 if address != 0x4adcb0:return
 sp=cpu.reg_read(UC_X86_REG_ESP)
 cpu.reg_write(UC_X86_REG_EAX,color_index)
 color_index+=1
 cpu.reg_write(UC_X86_REG_ESP,sp+8)
 cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
def call(address,arguments):
 sp=stack+0xff00
 for i,value in enumerate([stop,*arguments]):write(sp+i*4,value)
 cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.reg_write(UC_X86_REG_ESP,sp)
 try: cpu.emu_start(address,stop,count=10000000)
 except Exception:
  print('Failed at',hex(cpu.reg_read(UC_X86_REG_EIP)))
  raise
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Native font routine did not return')
cases=[]
for path in sorted(args.fonts.glob('*.fnt')):
 raw=path.read_bytes();cpu.mem_write(font_data,raw);color_index=0
 call(0x4b04b0,[0,font_data])
 height,space,count=struct.unpack('<hhh',cpu.mem_read(owner+4,6))
 glyph_at=read(owner+12);chars_at=read(owner+16);pixels_at=read(owner+20)
 glyphs=[]
 for i in range(count):
  x,y,w,h,offset=struct.unpack('<HHHHI',cpu.mem_read(glyph_at+i*12,12))
  glyphs.append({'y':y,'width':w,'height':h,'sha256':hashlib.sha256(cpu.mem_read(pixels_at+offset,w*h)).hexdigest()})
 samples=[]
 for text in ['', 'MOSS','CORAL','Bazooka 100',' A  Z ','0123456789', ''.join(chr(i) for i in range(1,256))]:
  cpu.mem_write(owner+0x200,text.encode('latin1')+b'\0')
  call(0x4b0a80,[owner+0x200,owner+0x400,owner+0x404])
  samples.append({'text':text,'width':read(owner+0x400),'height':read(owner+0x404)})
 cases.append({'name':path.stem,'sha256':hashlib.sha256(raw).hexdigest(),'height':height,'space':space,'characters':list(cpu.mem_read(chars_at,256)),'glyphs':glyphs,'samples':samples})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases},separators=(',',':'))+'\n')
print(f'{len(cases)} fonts parsed and measured by original executable')
