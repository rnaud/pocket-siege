"""Recover authored map long filenames from ISO Joliet/ISO9660 extent identity.

Keeps existing imported filenames and saved selections; emits only aliases whose
source bytes match an existing map. No positional or numeric alias guessing.
"""
import argparse, hashlib, json, struct
from pathlib import Path
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('iso', type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
catalog = json.loads((root/'src/armageddon/map-catalog.json').read_text())
with args.iso.open('rb') as stream:
    def walk(record, encoding, prefix=''):
        stream.seek(struct.unpack_from('<I', record, 2)[0]*2048)
        data = stream.read(struct.unpack_from('<I', record, 10)[0]); offset = 0
        while offset < len(data):
            length = data[offset]
            if not length:
                offset = (offset//2048+1)*2048; continue
            entry = data[offset:offset+length]; offset += length
            name = entry[33:33+entry[32]]
            if name in (b'\0', b'\1'): continue
            path = prefix+'/'+name.decode(encoding).split(';')[0]
            if entry[25]&2: yield from walk(entry, encoding, path)
            else: yield (path.lower(), struct.unpack_from('<I',entry,2)[0], struct.unpack_from('<I',entry,10)[0])
    primary = joliet = None
    for sector in range(16, 256):
        stream.seek(sector*2048); descriptor = stream.read(2048)
        if descriptor[1:6] != b'CD001': raise ValueError('Invalid ISO descriptor')
        if descriptor[0] == 1: primary = descriptor
        if descriptor[0] == 2 and descriptor[88:91] in (b'%/@',b'%/C',b'%/E'): joliet = descriptor
        if descriptor[0] == 255: break
    if primary is None or joliet is None: raise ValueError('ISO9660 and Joliet required')
    short = {path:(extent,size) for path,extent,size in walk(primary[156:156+primary[156]],'ascii')}
    long = {(extent,size):path for path,extent,size in walk(joliet[156:156+joliet[156]],'utf-16-be')}
    aliases = {}
    for asset in catalog:
        extent,size = short['/data/'+asset['id']]
        name = long[(extent,size)].removeprefix('/data/')
        stream.seek(extent*2048); data = stream.read(size)
        if data != (root/'public/armageddon'/asset['path']).read_bytes():
            raise ValueError('Imported bytes differ: '+asset['id'])
        aliases[name] = {'id':asset['id'],'sha256':hashlib.sha256(data).hexdigest()}
output = root/'src/armageddon/map-names.json'
output.write_text(json.dumps(dict(sorted(aliases.items())),indent=2)+'\n')
print(f'Verified {len(aliases)} authored map names against ISO bytes')
