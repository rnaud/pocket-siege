"""Extract original localized string-table resources, without executing the game."""
import argparse, hashlib, json, struct
from pathlib import Path
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('executable', type=Path)
p.add_argument('output', type=Path)
a = p.parse_args()
data = a.executable.read_bytes()
sha = hashlib.sha256(data).hexdigest()
if sha != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    p.error('Executable differs from verified WA 3.0.0.0')
def u16(at): return struct.unpack_from('<H', data, at)[0]
def u32(at): return struct.unpack_from('<I', data, at)[0]
pe = u32(0x3c); optional = pe + 24
sections = optional + u16(pe + 20)
def offset(rva):
    for i in range(u16(pe + 6)):
        at = sections + i * 40
        size, start, raw_size, raw = struct.unpack_from('<4I', data, at + 8)
        if start <= rva < start + max(size, raw_size): return raw + rva - start
    raise ValueError(f'Unmapped RVA {rva:x}')
root = offset(u32(optional + 112))
resources = {}
def walk(relative, path):
    at = root + relative
    for i in range(u16(at + 12) + u16(at + 14)):
        name, target = struct.unpack_from('<2I', data, at + 16 + 8 * i)
        if name & 0x80000000:
            pos = root + (name & 0x7fffffff)
            name = data[pos + 2:pos + 2 + u16(pos) * 2].decode('utf-16-le')
        if target & 0x80000000: walk(target & 0x7fffffff, path + [name])
        else:
            pos = root + target
            begin, length = offset(u32(pos)), u32(pos + 4)
            resources[tuple(path + [name])] = data[begin:begin + length]
walk(0, [])
blocks=[];indexes={};languages={};total=0
for path,blob in resources.items():
    if path[0]!=6:continue
    strings=[];at=0
    for i in range(16):
        length=struct.unpack_from('<H',blob,at)[0];at+=2
        text=blob[at:at+length*2].decode('utf-16-le');at+=length*2
        text.encode('cp1252') # Explicit supported ANSI boundary, no lossy replacement.
        strings.append(text)
    if at!=len(blob):raise ValueError(f'Trailing string block data: {path}')
    digest=hashlib.sha256(blob).hexdigest()
    if digest not in indexes:
        indexes[digest]=len(blocks);blocks.append(dict(sha256=digest,strings=strings))
    languages.setdefault(str(path[2]),{})[str(path[1])]=indexes[digest];total+=1
result=dict(executableSha256=sha,encoding='UTF-16LE source / explicit Windows-1252 adapter',blocks=blocks,languages=languages)
a.output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print(f'Extracted {total} string blocks in {len(languages)} languages; {len(blocks)} unique blocks')
