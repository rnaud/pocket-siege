"""Extract compact palette headers; unused sprite frames need not be fetched at boot."""
import json
import struct
from pathlib import Path
root=Path(__file__).resolve().parents[2]
colors=[]
sprites={}
for item in json.loads((root/'src/armageddon/sprite-ids.json').read_text())['sprites'].values():
 name=item['name'];raw=(root/f'public/armageddon/sprites/{name}.spr').read_bytes()
 indices=[]
 for i in range(struct.unpack_from('<H',raw,10)[0]):
  color=list(raw[12+i*3:15+i*3])
  if color not in colors:colors.append(color)
  indices.append(colors.index(color))
 sprites[name]=indices
(root/'src/armageddon/sprite-palette-data.json').write_text(json.dumps({'colors':colors,'sprites':sprites},separators=(',',':'))+'\n')
print(f'{len(sprites)} palette headers; {len(colors)} shared colors')
