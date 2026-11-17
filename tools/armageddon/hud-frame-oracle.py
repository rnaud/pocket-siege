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
list_calls=[]
list_scores=[101,201]
clock_frame_mode=False
clock_presentation_mode=False
clock_countdown_mode=False
announcement_draw_mode=False
announcement_audio_mode=False
announcement_message_mode=False
announcement_message=None
announcement_audio_calls=[]
announcement_draw=None
def hook(cpu,address,size,user):
 global announcement_draw, announcement_message
 if announcement_message_mode and address==stop+0x304: # External CRT sprintf for the source's single %s argument.
  sp=cpu.reg_read(UC_X86_REG_ESP)
  string=lambda at:bytes(cpu.mem_read(at,256)).split(b'\0')[0].decode('cp1252')
  value=string(read(sp+8)).replace('%s',string(read(sp+12))).encode('cp1252')
  cpu.mem_write(read(sp+4),value+b'\0');cpu.reg_write(UC_X86_REG_EAX,len(value))
  cpu.reg_write(UC_X86_REG_ESP,sp+4);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if announcement_message_mode and address==0x4b26a0:
  sp=cpu.reg_read(UC_X86_REG_ESP);payload=read(sp+24)
  announcement_message={'text':bytes(cpu.mem_read(read(payload+8),256)).split(b'\0')[0].decode('cp1252'),'font':read(payload+12)}
  cpu.reg_write(UC_X86_REG_ESP,sp+28);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if announcement_audio_mode and address in [0x4edb90,0x4edbe0,0x4edc30]:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  name,count={0x4edb90:('play',5),0x4edbe0:('volume',2),0x4edc30:('stop',1)}[address]
  announcement_audio_calls.append([name,*[struct.unpack('<i',cpu.mem_read(sp+4+i*4,4))[0] for i in range(count)]])
  cpu.reg_write(UC_X86_REG_EAX,17);cpu.reg_write(UC_X86_REG_ESP,sp+4+count*4);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if announcement_draw_mode and address==0x4edb70:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  cpu.reg_write(UC_X86_REG_EAX,read(sp+4));cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if announcement_draw_mode and address==0x4c67a0:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  announcement_draw={'text':bytes(cpu.mem_read(read(sp+4),80)).split(b'\0')[0].decode(),'font':read(sp+8),'coverage':read(sp+28)}
  write(read(sp+20),50);write(read(sp+24),17)
  cpu.reg_write(UC_X86_REG_EAX,owner+0x9000);cpu.reg_write(UC_X86_REG_ESP,sp+32);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if announcement_draw_mode and address==0x4eed30:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  announcement_draw['x']=struct.unpack('<i',cpu.mem_read(sp+8,4))[0]
  announcement_draw['y']=struct.unpack('<i',cpu.mem_read(sp+12,4))[0]
  cpu.reg_write(UC_X86_REG_ESP,sp+40);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if address==stop+0x300: # External CRT strncpy; native queue logic runs unchanged.
  sp=cpu.reg_read(UC_X86_REG_ESP);dest,source,length=[read(sp+i) for i in [4,8,12]]
  value=bytes(cpu.mem_read(source,length)).split(b'\0')[0][:length]
  cpu.mem_write(dest,value+bytes(length-len(value)))
  cpu.reg_write(UC_X86_REG_EAX,dest);cpu.reg_write(UC_X86_REG_ESP,sp+4)
  cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if clock_countdown_mode and address in [0x4b6565,0x4b65d8]:
  cpu.emu_stop();return
 if clock_presentation_mode and address==0x4b6727:
  cpu.emu_stop();return
 if clock_frame_mode and address==0x4edb70:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  cpu.reg_write(UC_X86_REG_EAX,22 if read(sp+4)==8 else 33)
  cpu.reg_write(UC_X86_REG_ESP,sp+8);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 offset=address-stop
 if clock_frame_mode and offset==0x14:
  sp=cpu.reg_read(UC_X86_REG_ESP)
  write(read(sp+4),56);write(read(sp+8),42)
  cpu.reg_write(UC_X86_REG_ESP,sp+12);cpu.reg_write(UC_X86_REG_EIP,read(sp));return
 if 0x200 <= offset <= 0x234:
  sp=cpu.reg_read(UC_X86_REG_ESP);obj=cpu.reg_read(UC_X86_REG_ECX)
  method=offset-0x200;row=(obj-owner-0x4000)//0x100
  result=0;argc=0
  if method==4:result=list_scores[row]
  if method==8:result=16
  if method==0x14:
   argc=4
   signed=lambda at:struct.unpack('<i',cpu.mem_read(at,4))[0]
   list_calls.append({'id':row,'x':signed(sp+4),'y':signed(sp+8)})
   counter=read(sp+12);write(counter,read(counter)+1)
  if method==0x2c:
   argc=1;list_calls.append(read(sp+4))
  cpu.reg_write(UC_X86_REG_EAX,result)
  cpu.reg_write(UC_X86_REG_ESP,sp+4+argc*4);cpu.reg_write(UC_X86_REG_EIP,read(sp))
  return
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
list_cases=[]
row_vtable=owner+0x5000
for offset in range(4,0x38,4):write(row_vtable+offset,stop+0x200+offset)
for i in range(2):write(owner+0x4000+i*0x100,row_vtable)
fields=['swap','swapProgress','removal','removeIndex','drop','velocity','quick']
def set_list(state):
 write(owner,0x526780);write(owner+4,len(state['order']));write(owner+0xc,owner+0x3000)
 for i,row in enumerate(state['order']):write(owner+0x3000+4*i,owner+0x4000+row*0x100)
 for i,key in enumerate(fields):write(owner+0x10+i*4,state[key]&0xffffffff)
def get_list():
 result={key:struct.unpack('<i',cpu.mem_read(owner+0x10+i*4,4))[0] for i,key in enumerate(fields)}
 result['order']=[(read(owner+0x3000+4*i)-owner-0x4000)//0x100 for i in range(read(owner+4))]
 return result
def run_list(address,args=[]):
 sp=stack+0xff00
 for i,v in enumerate([stop,*args]):write(sp+4*i,v&0xffffffff)
 cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
 cpu.emu_start(address,stop,count=100000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('List routine did not finish')
 return bool(cpu.reg_read(UC_X86_REG_EAX))
for operation in ['sort','remove','tick']:
 for swap,progress,removal,drop,velocity in [(-1,0,0,0,0),(0,0,0,0,0),(0,32768,0,0,0),(0,65000,0,0,0),(-1,0,1,0,0),(-1,0,1,65000,500),(-1,0,2,0,0),(-1,0,2,65000,500),(-1,0,2,65000,100)]:
  for list_scores in [[101,201],[201,101],[101,101],[101,0],[0,0]]:
   for quick in [0,1]:
    before={'order':[0,1],'swap':swap,'swapProgress':progress,'removal':removal,'removeIndex':1,'drop':drop,'velocity':velocity,'quick':quick}
    set_list(before);list_calls=[]
    result=run_list({'sort':0x4f00c0,'remove':0x4f0190,'tick':0x4efc50}[operation])
    after=get_list();events=list_calls[:];list_calls=[];write(owner+0x6000,0)
    run_list(0x4efda0,[0,0,owner+0x6000,len(after['order'])*16])
    list_cases.append({'operation':operation,'scores':list_scores,'before':before,'after':after,'result':events if operation=='tick' else result,'rows':list_calls[:]})
timer_cases=[]
for milliseconds in [0,1,249,250,251,499,500,749,750,999,1000,4750,4999,5000,5001,45000]:
 for running in [False,True]:
  write(owner+0x38,context);write(owner+0x184,milliseconds)
  for offset in [0x14c,0x170,0x174,0x160]:write(owner+offset,0)
  write(owner+0x128,int(running));cpu.mem_write(context+0x11d5f,b'\0')
  cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
  cpu.emu_start(0x4b59fb,0x4b5aa5,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4b5aa5:raise RuntimeError('Timer font prefix did not finish')
  timer_cases.append({'milliseconds':milliseconds,'running':running,'font':cpu.reg_read(UC_X86_REG_EBP)})
clock_slide_cases=[]
for progress in [0,3275,3276,3277,32768,62260,65536]:
 for target in [0,65536]:
  write(owner+0x18c,progress);write(owner+0x190,target)
  cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
  cpu.emu_start(0x4b6727,0x4b6769,count=1000)
  clock_slide_cases.append({'progress':progress,'target':target,'after':read(owner+0x18c)})
clock_frame_mode=True
write(owner+0x38,context);write(owner+0x21c,owner+0x7000)
write(owner+0x7000,vtable);write(vtable+0x14,stop+0x14)
cpu.mem_write(context+3000+0x3cd1,b'\x02')
sp=stack+0xff00;write(sp,stop);write(sp+4,1)
cpu.reg_write(UC_X86_REG_ECX,owner);cpu.reg_write(UC_X86_REG_ESP,sp)
calls=[];cpu.emu_start(0x4b56a0,stop,count=10000)
if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Clock frame did not finish')
clock_frame=calls[:]
clock_frame_mode=False
clock_presentation_mode=True
clock_presentation_cases=[]
clock_fields={'displayed':0x184,'warned':0x168,'lastSecond':0x17c,'phase':0x194}
for remaining in [0,1,999,1000,1001,3999,4000,4999,5000,5001,45000]:
 for selected in [False,True]:
  for displayed,warned,last_second in [(45000,0,0),(0,1,4),(remaining,1,remaining//1000)]:
   before={'displayed':displayed,'warned':warned,'lastSecond':last_second,'phase':123456}
   for key,offset in clock_fields.items():write(owner+offset,before[key])
   write(owner+0x38,context);write(owner+0x188,remaining);write(owner+0x128,int(selected))
   write(context+0x1b808+82*4,0x10016);write(context+0x1cad4,0)
   cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
   cpu.emu_start(0x4b6616,0x4b6727,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=0x4b6727:raise RuntimeError('Clock presentation did not finish')
   after={key:struct.unpack('<i',cpu.mem_read(owner+offset,4))[0] for key,offset in clock_fields.items()}
   sounds=[list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+j*20,20))) for j in range(read(context+0x1cad4))]
   clock_presentation_cases.append({'before':before,'remaining':remaining,'selected':selected,'after':{'state':after,'sounds':sounds}})
clock_presentation_mode=False
clock_countdown_mode=True
clock_countdown_cases=[]
for remaining in [-1,0,1,19,20,21,999,1000,45000]:
 for active in [False,True]:
  write(owner+0x38,context);write(owner+0x188,remaining&0xffffffff)
  write(context+0x1cad4,0)
  cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EAX,int(active))
  cpu.reg_write(UC_X86_REG_ESP,stack+0xff00)
  cpu.emu_start(0x4b6525,stop,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP) not in [0x4b6565,0x4b65d8]:raise RuntimeError('Clock countdown did not finish')
  sounds=[list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+j*20,20))) for j in range(read(context+0x1cad4))]
  clock_countdown_cases.append({'remaining':remaining,'active':active,'after':{'remaining':struct.unpack('<i',cpu.mem_read(owner+0x188,4))[0],'sounds':sounds}})
clock_countdown_mode=False
announcement_cases=[]
announcement_fields={'write':0x1c188,'read':0x1c18c,'stage':0x1c190,'elapsed':0x1c194,'scale':0x1c198}
for head,count in [(0,0),(0,1),(0,2),(0,3),(19,2)]:
 for stage,scale,elapsed in [(0,0,0),(1,0,0),(1,58980,0),(2,65536,740),(2,65536,860),(2,65536,1000),(2,65536,3000),(3,65536,0),(3,6556,0)]:
  for long in [0,1]:
   before={'read':head,'write':(head+count)%20,'stage':stage,'elapsed':elapsed,'scale':scale,'blocking':long}
   for key,offset in announcement_fields.items():write(context+offset,before[key])
   for row in range(20):write(context+0x1c1a0+row*100,long)
   write(owner+0x38,context);write(owner+0x94,long);write(owner+0xd0,owner+0x8000)
   sp=stack+0xff00;write(sp,stop)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4eca40,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Announcement controller did not finish')
   after={key:struct.unpack('<i',cpu.mem_read(context+offset,4))[0] for key,offset in announcement_fields.items()}
   after['blocking']=read(owner+0x94)
   write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4eca20,stop,count=1000)
   pending=bool(cpu.reg_read(UC_X86_REG_EAX)&255)
   announcement_cases.append({'before':before,'long':long,'after':after,'pending':pending})
announcement_queue_cases=[]
write(0x517904,stop+0x300)
for head,tail,text_value,font in [(0,0,'READY',15),(19,19,'WRAP',-15),(0,19,'FULL',15),(0,19,'!URGENT',-15),(3,5,'A'*95,28)]:
 cpu.mem_write(context+0x1c19c,bytes(2100))
 write(context+0x1c188,tail);write(context+0x1c18c,head);write(context+0x1c190,2)
 cpu.mem_write(owner+0x9000,text_value.encode()+b'\0');write(owner+0x38,context)
 sp=stack+0xff00
 for j,v in enumerate([stop,font&0xffffffff,owner+0x9000,2,1]):write(sp+j*4,v)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
 cpu.emu_start(0x4ec6a0,stop,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Announcement enqueue did not finish')
 index=head if text_value.startswith('!') else tail
 entry=None
 if read(context+0x1c188)!=(head if text_value.startswith('!') else tail):
  at=context+index*100
  entry={'text':bytes(cpu.mem_read(at+0x1c1ac,81)).split(b'\0')[0].decode(),'font':read(at+0x1c1a8),'long':read(at+0x1c1a0),'team':read(at+0x1c19c),'teamOnly':read(at+0x1c1a4)}
 announcement_queue_cases.append({'head':head,'tail':tail,'text':text_value,'font':font,'after':{'read':read(context+0x1c18c),'write':read(context+0x1c188),'stage':read(context+0x1c190),'entry':entry,'index':index}})
announcement_mask_cases=[]
for width,height,stride in [(7,3,7),(17,5,20),(32,16,32)]:
 for seed in [0,0xffffffff,0x3c6ef35f]:
  for coverage in [1,19660,39320,58980,65535]:
   buffer=owner+0x9000;cpu.mem_write(buffer,bytes([1])*(stride*height))
   sp=stack+0xff00
   for j,v in enumerate([stop,buffer,stride-width,width,height,0,seed,(coverage<<16)&0xffffffff]):write(sp+j*4,v)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.emu_start(0x4ac953,stop,count=100000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Announcement dissolve did not finish')
   mask=[value for row in range(height) for value in cpu.mem_read(buffer+row*stride,width)]
   announcement_mask_cases.append({'length':width*height,'seed':seed,'coverage':coverage,'mask':mask})
announcement_frame_cases=[]
for width,height in [(0,16),(50,16),(226,24),(300,32)]:
 write(owner+0xc,owner+0x7000);write(owner+0x7000,vtable)
 write(owner+0x8000,width);write(owner+0x8004,height)
 sp=stack+0xff00;write(sp+0x24,7)
 cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner)
 cpu.reg_write(UC_X86_REG_ESI,owner+0x8000);cpu.reg_write(UC_X86_REG_EBP,owner+0x8004)
 calls=[];cpu.emu_start(0x4c6894,0x4c698c,count=10000)
 if cpu.reg_read(UC_X86_REG_EIP)!=0x4c698c:raise RuntimeError('Announcement border did not finish')
 announcement_frame_cases.append({'width':width,'height':height,'calls':calls[:]})
announcement_draw_mode=True
announcement_draw_cases=[]
for height in [480,696]:
 for playback in [0,32768,65536]:
  for stage,coverage,team_only,visible in [(0,65536,0,1),(1,0,0,1),(1,19660,0,1),(2,65536,0,1),(2,65536,1,0),(2,65536,1,1)]:
   write(owner+0x38,context);write(owner+0x9c,playback)
   write(context+0x1b8e0,height);write(context+0x1c18c,0)
   write(context+0x1c190,stage);write(context+0x1c198,coverage)
   write(context+0x1c19c,2);write(context+0x1c1a4,team_only);write(context+0x1c168,visible)
   write(context+0x1c1a8,23);cpu.mem_write(context+0x1c1ac,b'READY\0')
   sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   announcement_draw=None;cpu.emu_start(0x4ec930,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Announcement draw did not finish')
   result=announcement_draw if announcement_draw and 'x' in announcement_draw else None
   announcement_draw_cases.append({'height':height,'playback':playback,'stage':stage,'coverage':coverage,'teamOnly':team_only,'visible':visible,'after':result})
announcement_draw_mode=False
announcement_audio_mode=True
announcement_audio_cases=[]
for volume in [0,1,457,458,459,6553,65536,70000]:
 for handle in [0,17]:
  for long_message in [0,1]:
   write(owner+0x38,context);write(owner+0x94,long_message);write(owner+0xac,handle);write(context+0x12468,volume)
   sp=stack+0xff00;write(sp,stop);cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   announcement_audio_calls=[];cpu.emu_start(0x4eb800,stop,count=10000)
   if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Announcement audio did not finish')
   announcement_audio_cases.append({'volume':volume,'handle':handle,'long':long_message,'after':{'volume':read(context+0x12468),'handle':read(owner+0xac),'calls':announcement_audio_calls[:]}})
announcement_audio_mode=False
team_sound_cases=[]
for drop in [0,32768,65536]:
 for bounce in [0,2620,32768,65536,131072]:
  write(owner+0x38,context);write(context+0x1c140,drop);write(context+0x1c144,bounce);write(context+0x1cad4,0)
  cpu.reg_write(UC_X86_REG_ESP,stack+0xff00);cpu.reg_write(UC_X86_REG_ESI,owner)
  cpu.emu_start(0x4ec50d,0x4ec567,count=10000)
  if cpu.reg_read(UC_X86_REG_EIP)!=0x4ec567:raise RuntimeError('Team sound block did not finish')
  calls=[list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+j*20,20))) for j in range(read(context+0x1cad4))]
  team_sound_cases.append({'before':{'drop':drop,'bounce':bounce},'after':{'drop':read(context+0x1c140),'bounce':read(context+0x1c144)},'calls':calls})
announcement_message_mode=True
write(0x5178f4,stop+0x304)
elimination_cases=[]
for kind,table in [('elimination',0x558a60),('victory',0x5589a8),('draw',0x558a90),('suddenDeath',0x558af0)]:
 for seed in [0,1,42,0x12345678,0xffffffff]:
  for frame in [0,1,50,2000]:
   for color in [0,2]:
    name='CORAL CREW' if color==0 else 'MOSS COMPANY'
    cpu.mem_write(owner+0x9000,name.encode()+b'\0');write(owner+0x38,context)
    write(context+0x1acc,seed);write(context+0x7f0,frame)
    sp=stack+0xff00
    for j,v in enumerate([stop,table,23 if kind in ['draw','suddenDeath'] else color+17,owner+0x9000]):write(sp+j*4,v)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    announcement_message=None;cpu.emu_start(0x4eeee0,stop,count=10000)
    if cpu.reg_read(UC_X86_REG_EIP)!=stop:raise RuntimeError('Elimination message selection did not finish')
    elimination_cases.append({'kind':kind,'seed':seed,'frame':frame,'name':name,'color':color,'random':read(context+0x1acc),'message':announcement_message})
args.output.write_text(json.dumps({'sha256':digest,'cases':cases,'panelCases':panel_cases,'visibilityCases':visibility_cases,'healthCases':health_cases,'highlightCases':highlight_cases,'listCases':list_cases,'timerCases':timer_cases,'clockSlideCases':clock_slide_cases,'clockFrame':clock_frame,'clockPresentationCases':clock_presentation_cases,'clockCountdownCases':clock_countdown_cases,'announcementCases':announcement_cases,'announcementQueueCases':announcement_queue_cases,'announcementMaskCases':announcement_mask_cases,'announcementFrameCases':announcement_frame_cases,'announcementDrawCases':announcement_draw_cases,'announcementAudioCases':announcement_audio_cases,'teamSoundCases':team_sound_cases,'eliminationCases':elimination_cases},separators=(',',':'))+'\n')
print(f'{len(list_cases)} list/controller drawing cases')
