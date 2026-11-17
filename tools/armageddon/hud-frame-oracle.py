"""Capture original004B8660 HUD frame drawing requests."""
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

vtable=owner+0x1000;write(owner,vtable)
methods={0x34:('horizontal',4),0x38:('vertical',4),0x3c:('rect',5),0x58:('pixel',3)}
for offset in methods:write(vtable+offset,stop+offset)
calls=[]
keys=(0,0)
def hook(cpu,address,size,user):
 offset=address-stop
 if offset in [0x100,0x104]:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  key=read(sp+4)
  cpu.reg_write(UC_X86_REG_EAX,keys[0] if key==0x27 else keys[1])
  cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,read(sp))
  return
 if offset not in methods:return
 name,n=methods[offset];sp=cpu.reg_read(UC_X86_REG_ESP)
 calls.append([name,*[read(sp+4+i*4) for i in range(n)]])
 cpu.reg_write(UC_X86_REG_ESP,sp+4+n*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
cpu.hook_add(UC_HOOK_CODE,hook)
cases=[]
for width,height in [(4,5),(20,12),(104,17),(181,17),(200,40)]:
 calls=[];sp=stack+0xff00
 for i,v in enumerate([stop,owner,11,22,33,width,height]):write(sp+i*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4b8660,stop,count=1000000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('HUD routine did not return')
 cases.append({'width':width,'height':height,'calls':calls})
panel_cases=[]
for progress in [0,3276,6553,6554,32768,62260,65536]:
 for target in [0,65536]:
  for countdown in [0,1,2,50]:
   for offset,value in [(0x74,progress),(0x78,target),(0x7c,countdown),(0x80,0)]:write(owner+offset,value)
   cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4ec470,0x4ec4ff,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4ec4ff:raise RuntimeError('Panel prefix did not finish')
   panel_cases.append({'before':{'progress':progress,'target':target,'countdown':countdown},
     'after':dict(zip(['progress','target','countdown'],[read(owner+o) for o in [0x74,0x78,0x7c]]))})
visibility_cases=[]
context=0x2300000
cpu.mem_map(context,0x20000)
write(owner+0x38,context)
keyboard=owner+0x2000;keyboard_vtable=owner+0x2100
write(context+4,keyboard);write(keyboard,keyboard_vtable)
write(keyboard_vtable+4,stop+0x100);write(keyboard_vtable+8,stop+0x104)
for minimum in [0,3275,3276,3277,32768,62260,65536]:
 for forced in [0,1]:
  for keys in [(0,0),(1,0),(0,1),(1,1)]:
   write(context+0x1b8b4,minimum);write(context+0x1b8b8,forced)
   write(stack+0xff00,stop)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4ec350,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Visibility routine did not return')
   visibility_cases.append({'before':{'minimum':minimum,'forced':forced},'keys':keys,
     'after':{'minimum':read(context+0x1b8b4),'forced':read(context+0x1b8b8)}})
health_cases=[]
write(owner+4,1);write(owner+0xc,context)
store=context+0x1b94+0x51c
for roster in [[(100,0)]*3,[(90,10)]*3,[(90,0)]*3,[(0,100),(50,50),(100,0)],[(0,0)]*3,[(150,0)]*3,[(32768,0)]]:
 for maximum in [300,450,600]:
  for value in [0,655,656,32768,58982,65536]:
   for surrendered in [0,1]:
    write(store,len(roster));write(store-12,surrendered)
    for i,(hp,damage) in enumerate(roster):
     write(store-0x49c+i*0x9c,hp);write(store-0x4a4+i*0x9c,damage)
    write(context+0x81c,maximum);write(context+0x1b60,value);write(context+0x800,0)
    write(stack+0xff00,stop)
    cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
    cpu.emu_start(0x4b8580,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Health routine did not return')
    signed=lambda address:struct.unpack('<i',cpu.mem_read(address,4))[0]
    health_cases.append({'roster':[{'hp':h,'damageTaken':d} for h,d in roster],
     'maximum':maximum,'value':value,'surrendered':bool(surrendered),
     'after':{'value':signed(context+0x1b60),'target':signed(context+0x1b78),'busy':read(context+0x800)==12}})
highlight_cases=[]
write(owner+0x20,16)
for color in range(6):
 for selected in [0,1]:
  for tick in [-51,-25,-1,0,1,24,25,49,50,74,75,2147483647]:
   write(owner+8,color);write(store-4,selected);write(context+0x1b8ec,tick&0xffffffff)
   cpu.mem_write(context+3000+0x3cd2,b'\0')
   sp=stack+0xff00
   for i,v in enumerate([stop,0,0,owner+0x3000]):write(sp+i*4,v)
   cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
   cpu.emu_start(0x4b87b0,0x4b883c,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4b883c:raise RuntimeError('Highlight prefix did not finish')
   highlight_cases.append({'color':color,'selected':selected,'tick':tick,
     'after':{'flashing':bool(cpu.reg_read(UC_X86_REG_EBP)),'font':cpu.reg_read(UC_X86_REG_EAX)}})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases,'panelCases':panel_cases,'visibilityCases':visibility_cases,'healthCases':health_cases,'highlightCases':highlight_cases},separators=(',',':'))+'\n')
print(f'{len(cases)} frames, {len(panel_cases)} panel ticks, {len(visibility_cases)} visibility ticks, {len(health_cases)} health ticks, {len(highlight_cases)} highlights')
