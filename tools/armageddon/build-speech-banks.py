"""Index native speech slots available in the shipped voice banks."""
import json
from pathlib import Path
root=Path(__file__).resolve().parents[2]
catalog=json.loads((root/'public/armageddon/voices.json').read_text())
slots=json.loads((root/'src/armageddon/speech-slots.json').read_text())['slots']
banks={}
for bank,clips in catalog.items():
    banks[bank]=[]
    for slot,entry in slots.items():
        if entry['clip'] in clips:
            assert (root/'public/armageddon/voices'/bank/entry['clip']).is_file()
            banks[bank].append(int(slot))
    banks[bank].sort()
(root/'src/armageddon/speech-bank-data.json').write_text(json.dumps({'source':'public/armageddon/voices.json + speech-slots.json','banks':banks},separators=(',',':'))+'\n')
print(f'Indexed {len(banks)} speech banks')
