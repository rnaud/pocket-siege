"""Extract Landgen's ordered terrain object definitions from original LEVEL archives.

0040A3F0 reads index.txt; 004053E0 consumes six decimal fields from each
<name>.inf and loads <name>.img. Trailing legacy INF lines are not consumed.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('level', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
result = {}
for directory in sorted(args.level.iterdir()):
    archive = directory / 'LEVEL.DIR'
    if not archive.is_file():
        continue
    data = archive.read_bytes()
    if data[:4] != b'DIR\x1a':
        raise ValueError('Bad DIR magic')
    size, toc = struct.unpack_from('<II', data, 4)
    if size != len(data) or struct.unpack_from('<I', data, toc)[0] != 10:
        raise ValueError('Bad DIR header')
    entries, seen = {}, set()
    for entry in struct.unpack_from('<1024I', data, toc + 4):
        while entry:
            if entry in seen:
                raise ValueError('Repeated DIR entry')
            seen.add(entry)
            pos = toc + entry
            entry, offset, length = struct.unpack_from('<III', data, pos)
            name = data[pos + 12:data.index(0, pos + 12)].decode('ascii').lower()
            if offset + length > toc or '/' in name or '\\' in name:
                raise ValueError('Invalid DIR member')
            entries[name] = data[offset:offset + length]
    names = entries['index.txt'].decode('ascii').split()
    objects = []
    for name in names:
        name = name.lower()
        raw = entries[name + '.inf']
        fields = [int(value) for value in raw.decode('ascii').split()[:6]]
        if len(fields) != 6 or not all(value >= 0 for value in fields):
            raise ValueError('Unsupported object fields')
        if name + '.img' not in entries:
            raise ValueError('Missing object image')
        objects.append({'name': name, 'fields': fields,
                        'definition': raw.decode('ascii'),
                        'sha256': hashlib.sha256(raw).hexdigest()})
    result[directory.name.lower()] = {'archive_sha256': hashlib.sha256(data).hexdigest(), 'objects': objects}
(root / 'src/armageddon/terrain-objects.json').write_text(json.dumps(result, indent=2) + '\n')
print(len(result), 'themes;', sum(len(t['objects']) for t in result.values()), 'ordered objects')
