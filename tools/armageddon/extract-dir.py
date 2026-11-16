"""Extract a Team17 DIR archive to a specified folder (preserves original bytes)."""
import argparse
from pathlib import Path
import struct

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("archive", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
data = args.archive.read_bytes()
assert data[:4] == b"DIR\x1a", "Not a Team17 DIR archive"
size, toc = struct.unpack_from("<II", data, 4)
assert size == len(data) and struct.unpack_from("<I", data, toc)[0] == 10
seen = set()
for entry in struct.unpack_from("<1024I", data, toc + 4):
    while entry:
        assert entry not in seen, "Cyclic or duplicate archive entry"
        seen.add(entry)
        pos = toc + entry
        entry, offset, length = struct.unpack_from("<III", data, pos)
        name = data[pos + 12:data.index(0, pos + 12)].decode("ascii")
        assert name and Path(name).name == name and name not in (".", "..")
        assert offset + length <= toc, "Entry outside data area"
        args.output.mkdir(parents=True, exist_ok=True)
        (args.output / name).write_bytes(data[offset:offset + length])
print(f"Extracted {len(seen)} entries")
