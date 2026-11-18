"""Preserve original WAM mission/training sections without dropping unknown fields."""
import argparse, hashlib, json
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('directory',type=Path)
args=parser.parse_args()
records=[]
for source in sorted(args.directory.glob('*.WAM')):
 data=source.read_bytes();sections=[];current=None;unparsed=[]
 for line in data.decode('cp1252').splitlines():
  line=line.strip()
  if not line or line.startswith((';','#')):continue
  if line.startswith('[') and line.endswith(']'):
   current={'name':line[1:-1],'entries':[]};sections.append(current)
  elif '=' in line and current is not None:
   key,value=line.split('=',1);current['entries'].append([key.strip(),value.strip()])
  else:
   unparsed.append(line)
   if line.startswith('['):current=None
 records.append({'source':source.name,'sha256':hashlib.sha256(data).hexdigest(),'sections':sections,'unparsed':unparsed,'text':data.decode('cp1252')})
Path('src/armageddon/mission-catalog.json').write_text(json.dumps({'records':records},indent=2,ensure_ascii=False)+'\n')
print(f'Imported {len(records)} complete WAM definitions')
