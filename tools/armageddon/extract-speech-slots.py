"""Extract the original speech descriptor IDs and resolve imported English clips."""
import argparse
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    parser.error('Expected verified WA 3.0.0.0 executable')
pe = struct.unpack_from('<I', data, 0x3c)[0]
optional = pe + 24
base = struct.unpack_from('<I', data, optional + 28)[0]
headers = optional + struct.unpack_from('<H', data, pe + 20)[0]
sections = [struct.unpack_from('<IIII', data, headers + i * 40 + 8)
            for i in range(struct.unpack_from('<H', data, pe + 6)[0])]
def offset(address):
    for size, rva, rawsize, raw in sections:
        if base + rva <= address < base + rva + rawsize:
            return raw + address - base - rva
    raise ValueError(hex(address))
root = Path(__file__).resolve().parents[2] / 'public/armageddon/voices/english'
files = [p.name for p in root.glob('*.wav')]
slots = {}
address = 0x55f460
while True:
    slot, pointer = struct.unpack_from('<II', data, offset(address))
    if not slot or not pointer:
        break
    start = offset(pointer)
    original = data[start:data.index(b'\0', start)].decode('ascii')
    name = original.lower()
    candidates = [f for f in files if f == name or
                  ('~' in f and name.startswith(f.split('~')[0]))]
    if len(candidates) != 1 or str(slot) in slots:
        raise ValueError((slot, original, candidates))
    clip = candidates[0]
    slots[str(slot)] = {'descriptor': hex(address), 'name': original,
                        'clip': clip, 'sha256': hashlib.sha256((root / clip).read_bytes()).hexdigest()}
    address += 8
args.output.write_text(json.dumps({'executable_sha256': digest, 'slots': slots}, indent=2) + '\n')
print(f'Extracted {len(slots)} speech slots')
