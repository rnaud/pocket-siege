"""Extract the English localisation getter table used by 004B90A0 weapon names.

Each vtable entry at 005259C8 is a two-instruction getter (mov eax, string;
ret). The weapon initializer calls entry method/4 for every name it writes,
so the table index is the method offset divided by four.
"""
import argparse, hashlib, json, struct
from pathlib import Path
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('executable', type=Path)
p.add_argument('output', type=Path)
a = p.parse_args()
data = a.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    p.error('Executable differs from verified WA 3.0.0.0')
pe = struct.unpack_from('<I', data, 0x3c)[0]
base = struct.unpack_from('<I', data, pe + 24 + 28)[0]
sections = []
headers = pe + 24 + struct.unpack_from('<H', data, pe + 20)[0]
for i in range(struct.unpack_from('<H', data, pe + 6)[0]):
    vsize, rva, size, offset = struct.unpack_from('<IIII', data, headers + 40 * i + 8)
    sections.append((base + rva, max(vsize, size), offset, size))
def read(address, length):
    for va, span, offset, size in sections:
        if va <= address < va + span:
            start = offset + address - va
            return data[start:start + length]
    raise ValueError(hex(address))
strings, address = [], 0x5259c8
while True:
    target = struct.unpack('<I', read(address, 4))[0]
    if not 0x401000 <= target < 0x520000: break
    code = read(target, 6)
    # Non-constant entries (other virtual methods) are kept as null.
    if code[0] == 0xb8 and code[5] == 0xc3:
        text = read(struct.unpack('<I', code[1:5])[0], 256).split(b'\0')[0]
        strings.append(text.decode('latin-1'))
    else:
        strings.append(None)
    address += 4
a.output.write_text(json.dumps({'executable_sha256': digest, 'vtable': '005259C8',
    'method': 'Getter index = method offset / 4; strings are Windows-1252 bytes as Latin-1.',
    'strings': strings}, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'Captured {len(strings)} localized strings')
