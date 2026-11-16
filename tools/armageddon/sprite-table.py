"""Extract WA 3.0.0.0's native sprite IDs from its resource descriptor table.

The Gfx loader 004CBB50 passes table 00564A78; the water loader
004CBB70 passes table 00566E78. Each descriptor is
{uint32 id, char *filename, uint32 flags}; an all-zero record ends the table.
No executable code is emitted or executed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
parser.add_argument('--bank', choices=['gfx', 'water'], default='gfx')
args = parser.parse_args()
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    parser.error('Executable differs from verified WA 3.0.0.0')
pe = struct.unpack_from('<I', data, 0x3c)[0]
optional = pe + 24
base = struct.unpack_from('<I', data, optional + 28)[0]
section_headers = optional + struct.unpack_from('<H', data, pe + 20)[0]
sections = [struct.unpack_from('<IIII', data, section_headers + 40*i + 8)
            for i in range(struct.unpack_from('<H', data, pe + 6)[0])]
def offset(address):
    rva = address - base
    for _, section_rva, size, file_offset in sections:
        if section_rva <= rva < section_rva + size:
            return file_offset + rva - section_rva
    raise ValueError(f'Address outside file-backed PE sections: {address:08x}')

sprites = {}
address = 0x564a78 if args.bank == 'gfx' else 0x566e78
while True:
    identity, pointer, flags = struct.unpack_from('<III', data, offset(address))
    if not (identity or pointer or flags): break
    start = offset(pointer)
    name = data[start:data.index(b'\0', start)].decode('ascii')
    if not name.endswith('.spr') or identity in sprites:
        raise ValueError(f'Unexpected descriptor at {address:08x}')
    sprites[identity] = {'name': name[:-4], 'flags': flags}
    address += 12
if len(sprites) != (767 if args.bank == 'gfx' else 74):
    raise ValueError(f'Unexpected descriptor count {len(sprites)}')
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({'executable_sha256': digest,
    'table': '00564A78' if args.bank == 'gfx' else '00566E78',
    'loader': '004CBB50' if args.bank == 'gfx' else '004CBB70',
    'sprites': dict(sorted(sprites.items()))}, indent=2)+'\n')
print(f'Extracted {len(sprites)} native sprite IDs; terminator {address:08X}')
