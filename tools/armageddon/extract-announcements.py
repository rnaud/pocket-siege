"""Extract WA 3.0.0.0 English team-elimination announcement variants."""
import argparse, hashlib, json, struct
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable',type=Path)
parser.add_argument('output',type=Path)
a=parser.parse_args();data=a.executable.read_bytes();digest=hashlib.sha256(data).hexdigest()
if digest!='0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':parser.error('Unexpected executable')
pe=struct.unpack_from('<I',data,60)[0];optional=pe+24
base=struct.unpack_from('<I',data,optional+28)[0]
headers=optional+struct.unpack_from('<H',data,pe+20)[0]
sections=[struct.unpack_from('<IIII',data,headers+40*i+8) for i in range(struct.unpack_from('<H',data,pe+6)[0])]
def offset(address):
 for _,rva,size,raw in sections:
  if rva<=address-base<rva+size:return raw+address-base-rva
 raise ValueError(hex(address))
# English vtable 005259C8 + 0x28 -> 00495790 -> table 00558A60.
messages=[];at=offset(0x558a60)
while True:
 pointer=struct.unpack_from('<I',data,at)[0];at+=4
 if not pointer:break
 start=offset(pointer);end=data.index(b'\0',start)
 messages.append(data[start:end].decode('cp1252'))
a.output.write_text(json.dumps({'sha256':digest,'table':'00558A60','messages':messages},indent=2)+'\n')
print(f'Extracted {len(messages)} English elimination variants')
