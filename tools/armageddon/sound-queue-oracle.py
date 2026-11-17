"""Execute the original sound queue insertion and frame-drain instructions.

Runs full 004EDC90 and drain block 004A1C22..004A1CBB; backend calls are captured.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBP, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP
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

context = 0x2300000
cpu.mem_map(context, 0x20000)
write(owner+0x38,context); write(owner+0x2a0,context)
backend,vtable,submit=owner+0x1000,owner+0x2000,stop+0x100
write(backend,vtable);write(vtable+12,submit)
cpu.mem_write(submit,b'\xc2\x14\x00')
calls=[]
def capture(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 calls.append(list(struct.unpack('<5i',cpu.mem_read(sp+4,20))))
cpu.hook_add(UC_HOOK_CODE,capture,begin=submit,end=submit)
cases=[]
for count in [0,1,15,16,17,32]:
 for disabled in [0,1]:
  for present in [0,1]:
   write(context+0x1cad4,0)
   inputs=[];accepted=[]
   for i in range(count):
    request=[i+100,(i*7)%10,65536+i,32768-i,-65536+i]
    inputs.append(request);sp=stack+0xf000
    for j,value in enumerate([stop,*request]):write(sp+j*4,value&0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
    cpu.emu_start(0x4edc90,stop,count=1000)
    assert cpu.reg_read(UC_X86_REG_EIP)==stop
    accepted.append(cpu.reg_read(UC_X86_REG_EAX))
   stored=[list(struct.unpack('<5i',cpu.mem_read(context+0x1c994+i*20,20))) for i in range(read(context+0x1cad4))]
   write(context+0x1d448,disabled);write(context+12,backend if present else 0)
   calls=[]
   cpu.reg_write(UC_X86_REG_ESI,owner);cpu.reg_write(UC_X86_REG_EBX,0);cpu.reg_write(UC_X86_REG_ESP,stack+0xe000)
   cpu.emu_start(0x4a1c22,0x4a1cbb,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x4a1cbb
   cases.append(dict(inputs=inputs,accepted=accepted,stored=stored,disabled=disabled,present=present,calls=calls,remaining=read(context+0x1cad4)))

# Full 004967E0, with DirectSound Stop/Release calls captured at the boundary.
stop_buffer,release_buffer=stop+0x200,stop+0x204
cpu.mem_write(stop_buffer,b'\xc2\x04\x00');cpu.mem_write(release_buffer,b'\xc2\x04\x00')
channel_vtable=owner+0x3000
write(channel_vtable+0x48,stop_buffer);write(channel_vtable+8,release_buffer)
channel_calls=[]
def capture_channel(cpu,address,size,user):
 sp=cpu.reg_read(UC_X86_REG_ESP)
 channel_calls.append(['stop' if address==stop_buffer else 'release',(read(sp+4)-(owner+0x4000))//0x100])
cpu.hook_add(UC_HOOK_CODE,capture_channel,begin=stop_buffer,end=release_buffer)
channel_cases=[]
layouts=[[None]*8,[3]*8,[8]*8,[1,2,3,4,5,6,7,8],[8,7,6,5,4,3,2,1],[3,1,3,1,3,1,3,1],[-1,0,-1,0,-1,0,-1,0],[2147483647]*8]
layouts += [[3 if j!=i else None for j in range(8)] for i in range(8)]
for priorities in layouts:
 for incoming in [-2147483648,-1,0,1,3,8,2147483647]:
  for tracked in [False,True]:
   for i,priority in enumerate(priorities):
    buffer=owner+0x4000+i*0x100;write(buffer,channel_vtable)
    write(owner+0x28+i*24,buffer if priority is not None else 0)
    write(owner+0x1c+i*24,(priority or 0)&0xffffffff)
    write(owner+0x18+i*24,i if tracked else 0xffffffff)
    write(owner+0x8a8+i*4,i)
   channel_calls=[];sp=stack+0xf000
   write(sp,stop);write(sp+4,incoming&0xffffffff)
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x4967e0,stop,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   result=cpu.reg_read(UC_X86_REG_EAX);result=result if result<0x80000000 else result-0x100000000
   channel_cases.append(dict(priorities=priorities,incoming=incoming,tracked=tracked,result=result,calls=channel_calls,
    occupied=[bool(read(owner+0x28+i*24)) for i in range(8)],handles=[read(owner+0x8a8+i*4) for i in range(8)]))

# Original mixer block, after successful sample duplication. DirectSound calls
# are captured; clamp, fixed-point multiply and table lookup execute unchanged.
table=list(struct.unpack('<65h',cpu.mem_read(0x55e2f8,130)))
Path('src/armageddon/sound-attenuation.json').write_text(json.dumps(table)+'\n')
mix_vtable=owner+0x5000;mix_buffer=owner+0x6000
write(mix_buffer,mix_vtable)
mix_methods={0x34:('position',2),0x44:('frequency',2),0x3c:('volume',2),0x40:('pan',2),0x30:('play',4)}
for offset,(_,argc) in mix_methods.items():
 address=stop+0x400+offset;write(mix_vtable+offset,address);cpu.mem_write(address,b'\xc2'+struct.pack('<H',argc*4))
mix_calls=[]
def capture_mix(cpu,address,size,user):
 offset=address-stop-0x400
 if offset in mix_methods:
  name,argc=mix_methods[offset];sp=cpu.reg_read(UC_X86_REG_ESP)
  mix_calls.append([name,*struct.unpack('<'+'i'*(argc-1),cpu.mem_read(sp+8,(argc-1)*4))])
cpu.hook_add(UC_HOOK_CODE,capture_mix,begin=stop+0x430,end=stop+0x444)
mix_cases=[]
levels=[-1,0,1,1023,1024,32768,65535,65536,65537]+[i*1024 for i in range(65)]
for flags in [0,0x10000,0x20000,0x30000]:
 for master in [0,32768,65536]:
  for i,volume in enumerate(levels):
   pan=[-99999,-65536,-32768,-1024,0,1024,32768,65536,99999][i%9]
   pitch=[32768,65536,98304][i%3];frequency=[11025,22050,44100][i%3];speed=1+i%2
   sp=stack+0xe000;write(owner+0x28,mix_buffer);write(owner+0x8a4,master);write(owner+0xa34,speed)
   for offset,value in [(0x10,1|flags),(0x14,int(bool(flags&0x10000))),(0x18,frequency),(0x24,3),(0x28,pitch),(0x2c,volume),(0x30,pan)]:write(sp+offset,value&0xffffffff)
   mix_calls=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_EBX,owner);cpu.reg_write(UC_X86_REG_EDI,owner);cpu.reg_write(UC_X86_REG_ESI,0)
   cpu.emu_start(0x496a1c,0x496b27,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==0x496b27
   calls=mix_calls[:]
   # Update the same retained channel via actual handle API: no initial 3/4.
   write(owner+0x8a8,0);write(sp,stop);write(sp+4,1);write(sp+8,volume&0xffffffff)
   mix_calls=[];cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(0x496d80,stop,count=10000)
   assert cpu.reg_read(UC_X86_REG_EIP)==stop
   mix_cases.append(dict(flags=flags,master=master,volume=volume,pan=pan,pitch=pitch,frequency=frequency,speed=speed,calls=calls,updates=mix_calls))

# Full handle allocation/release routines. The sample-start boundary returns
# a supplied channel (channel arbitration is verified above in channelCases).
selected_channel=0
cpu.mem_write(0x496940,b'\xc2\x14\x00')
def sample_start(cpu,address,size,user):cpu.reg_write(UC_X86_REG_EAX,selected_channel&0xffffffff)
cpu.hook_add(UC_HOOK_CODE,sample_start,begin=0x496940,end=0x496940)
handle_cases=[]
sequences=[
 [('allocate',i%8) for i in range(34)]+[('release',i) for i in range(1,33)]+[('allocate',2)],
 [('allocate',0),('invalidate',32),('allocate',0),('release',32),('release',31),('allocate',7),('allocate',-1),('release',0),('release',33)],
 [('allocate',0),('allocate',1),('allocate',2),('release',31),('allocate',3),('release',32),('release',30),('release',31)],
]
for actions in sequences:
 write(owner+0x9a8,32);write(owner+0xa2c,0)
 for i in range(32):write(owner+0x8a8+i*4,0xffffffff);write(owner+0x928+i*4,i)
 for operation,value in actions:
  channel_calls=[]
  if operation=='invalidate':write(owner+0x8a8+(value-1)*4,0xffffffff);result=None
  else:
   sp=stack+0xf000;write(sp,stop)
   if operation=='allocate':
    selected_channel=value
    for i,v in enumerate([1,3,65536,65536,0]):write(sp+4+i*4,v)
    entry=0x496b90
   else:
    # Release's backend Stop/Release are the same captured interfaces as above.
    for i in range(8):
     buffer=owner+0x4000+i*0x100;write(buffer,channel_vtable);write(owner+0x28+i*24,buffer)
    write(sp+4,value);entry=0x496c90
   cpu.reg_write(UC_X86_REG_ESP,sp);cpu.reg_write(UC_X86_REG_ECX,owner)
   cpu.emu_start(entry,stop,count=10000);assert cpu.reg_read(UC_X86_REG_EIP)==stop
   result=cpu.reg_read(UC_X86_REG_EAX)
  handle_cases.append(dict(reset=operation==actions[0][0] and len(handle_cases)==0,operation=operation,value=value,result=result,calls=channel_calls,
   channels=[struct.unpack('<i',cpu.mem_read(owner+0x8a8+i*4,4))[0] for i in range(32)],
   free=[read(owner+0x928+i*4) for i in range(read(owner+0x9a8))],used=[read(owner+0x9ac+i*4) for i in range(read(owner+0xa2c))]))
 # Mark each sequence start, independent of operation/value repetition.
 handle_cases[-len(actions)]['reset']=True
args.output.write_text(json.dumps(dict(executableSha256=digest,cases=cases,channelCases=channel_cases,mixCases=mix_cases,handleCases=handle_cases),separators=(',',':'))+'\n')
print(f'Wrote {len(handle_cases)} handle transitions in addition to queue/channel/mixer cases')
