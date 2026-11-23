"""Capture the original held-aim step from the executable.

004FB567..004FB915 runs unchanged on a worm whose aim (+0x260), held flags
(+0x1E0 subtracts, +0x1DC adds), weapon record subtype (+0x354 -> +0x6C) and
weapon slot (+0x170) are set; the 0049BF90 clamp is original code too.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32
from unicorn.x86_const import UC_X86_REG_ESI, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EDI
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('executable', type=Path)
parser.add_argument('output', type=Path)
args = parser.parse_args()
data = args.executable.read_bytes()
digest = hashlib.sha256(data).hexdigest()
if digest != '0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56':
    parser.error('Executable differs from verified WA 3.0.0.0')
pe = struct.unpack_from('<I', data, 0x3c)[0]
optional = pe + 24
base = struct.unpack_from('<I', data, optional + 28)[0]
size = struct.unpack_from('<I', data, optional + 56)[0]
cpu = Uc(UC_ARCH_X86, UC_MODE_32)
cpu.mem_map(base, (size + 0xfff) & ~0xfff)
cpu.mem_write(base, data[:struct.unpack_from('<I', data, optional + 60)[0]])
headers = optional + struct.unpack_from('<H', data, pe + 20)[0]
for i in range(struct.unpack_from('<H', data, pe + 6)[0]):
    _, rva, length, offset = struct.unpack_from('<IIII', data, headers + 40 * i + 8)
    if length: cpu.mem_write(base + rva, data[offset:offset + length])
worm, record, stack = 0x2000000, 0x2010000, 0x2100000
for address in (worm, record, stack): cpu.mem_map(address, 0x10000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<i', cpu.mem_read(address, 4))[0]
cases = []
aims = [-0x400, 0, 0x100, 0x1ff, 0x200, 0x3ff0, 0x4000, 0x4100, 0x7f80, 0x8000, 0xbf00, 0xc000, 0xc100, 0xfa00, 0xfc00, 0xfd00, 0xfe00, 0x10000, 0x10100]
for aim in aims:
    for down, up in ((0, 0), (1, 0), (0, 1), (1, 1)):
        for subtype in (0, 3, 0xa):
            for slot in (1, 3, 15):
                write(worm + 0x260, aim); write(worm + 0x1e0, down); write(worm + 0x1dc, up)
                write(worm + 0x354, record); write(record + 0x6c, subtype); write(worm + 0x170, slot)
                cpu.reg_write(UC_X86_REG_ESI, worm); cpu.reg_write(UC_X86_REG_EDI, 0)
                cpu.reg_write(UC_X86_REG_ESP, stack + 0xf000)
                cpu.emu_start(0x4fb567, 0x4fb915, count=10000)
                if cpu.reg_read(UC_X86_REG_EIP) != 0x4fb915: raise RuntimeError('aim step did not reach 004FB915')
                cases.append({'input': {'aim': aim, 'down': down, 'up': up, 'subtype': subtype, 'slot': slot},
                              'aim': read(worm + 0x260)})
args.output.write_text(json.dumps({'sha256': digest, 'cases': cases}, separators=(',', ':')) + '\n')
print(f'{len(cases)} cases')
