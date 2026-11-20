"""Execute the original weapon panel ("arsenal") widget and team status strip.

Routines run unchanged: 00500170 constructor, 00500B20 measure/compose,
00500960 layout, 00500A40 position (with 00500290 cell and 005006B0 name
redraws), 00500FD0 selection and 004FFFE0 status strip, together with their
real helpers 0049BF90 (clamp), 004AA8F0 (special weapon) and 004AA990
(utility range). Inventory queries 004C2EE0/004C3050/004C29C0, sprintf, the
renderer text calls and the bitmap primitive vtable are stubs that record
their arguments in call order.
"""
import argparse
import hashlib
import json
import random
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EAX, UC_X86_REG_EIP

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

widget, strip, stack, stop, stubs, scene = 0x2000000, 0x2010000, 0x2100000, 0x2200000, 0x2300000, 0x3000000
for address in [widget, strip, stack, stop, stubs]: cpu.mem_map(address, 0x10000)
cpu.mem_map(scene, 0x20000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000
def sread(address): return signed(read(address))
def cstring(address):
    out = bytearray()
    while True:
        b = cpu.mem_read(address + len(out), 1)[0]
        if not b: return out.decode('latin-1')
        out.append(b)

# Stub objects. Each method is a callee-cleaned `ret N` that a code hook
# intercepts; inputs come from Python tables, never from patched code.
bitmap, renderer, service = stubs + 0x100, stubs + 0x200, stubs + 0x300
bitmap_vt, renderer_vt, service_vt = stubs + 0x1000, stubs + 0x1100, stubs + 0x1200
code = stubs + 0x2000
methods = {}
def method(vtable, slot, name, argc):
    address = code + len(methods) * 0x10
    cpu.mem_write(address, b'\xc2' + struct.pack('<H', argc * 4) if argc else b'\xc3')
    write(vtable + slot, address); methods[address] = (name, argc)
for slot, name, argc in [(0x14, 'size', 2), (0x34, 'horizontal', 4), (0x38, 'vertical', 4), (0x3c, 'rect', 5),
                         (0x4c, 'image', 8), (0x58, 'pixel', 3)]:
    method(bitmap_vt, slot, name, argc)
method(renderer_vt, 0x24, 'text', 7); method(renderer_vt, 0x28, 'fontHeight', 2)
method(service_vt, 0x40, 'label', 0)
write(bitmap, bitmap_vt); write(renderer, renderer_vt); write(service, service_vt)
label_text = stubs + 0x3000
cpu.mem_write(label_text, b'Util\0')
sprintf_stub = code + 0x800
cpu.mem_write(sprintf_stub, b'\xc3'); write(0x5178f4, sprintf_stub)
for address, argc in [(0x4c2ee0, 2), (0x4c3050, 2), (0x4c29c0, 1)]:
    cpu.mem_write(address, b'\xc2' + struct.pack('<H', argc * 4))

state = {}
calls = []
def hook(uc, address, _size, _):
    sp = uc.reg_read(UC_X86_REG_ESP)
    arg = lambda i: sread(sp + 4 + 4 * i)
    if address in methods:
        name, argc = methods[address]
        values = [arg(i) for i in range(argc)]
        if name == 'size':
            write(values[0], state['bitmap'][0]); write(values[1], state['bitmap'][1])
        elif name == 'fontHeight':
            calls.append(['fontHeight', *values]); uc.reg_write(UC_X86_REG_EAX, state['fontHeight'])
        elif name == 'label':
            uc.reg_write(UC_X86_REG_EAX, label_text)
        elif name == 'text':
            target = 'widget' if values[1] == bitmap else values[1]
            calls.append(['text', values[0], values[2], values[3], cstring(values[4] & 0xffffffff), target])
        elif name == 'image':
            calls.append(['image', *values[:4], values[4] & 0xffffffff, *values[5:]])
        else:
            calls.append([name, *values])
    elif address == sprintf_stub:
        buffer, fmt = read(sp + 4), cstring(read(sp + 8))
        out, index, k = '', 0, 0
        while k < len(fmt):
            if fmt[k] == '%':
                kind = fmt[k + 1]; value = read(sp + 12 + 4 * index); index += 1; k += 2
                out += cstring(value) if kind == 's' else str(signed(value))
            else: out += fmt[k]; k += 1
        cpu.mem_write(buffer, out.encode('latin-1') + b'\0')
    elif address == 0x4c2ee0:
        assert arg(0) == TEAM; uc.reg_write(UC_X86_REG_EAX, state['ammo'][arg(1)] & 0xffffffff)
    elif address == 0x4c3050:
        assert arg(0) == TEAM; uc.reg_write(UC_X86_REG_EAX, state['delay'][arg(1)] & 0xffffffff)
    elif address == 0x4c29c0:
        assert arg(0) == TEAM; uc.reg_write(UC_X86_REG_EAX, state['flags'] & 0xffffffff)
for address in list(methods) + [sprintf_stub, 0x4c2ee0, 0x4c3050, 0x4c29c0]:
    cpu.hook_add(UC_HOOK_CODE, hook, begin=address, end=address)

def packed(sequence):
    # Lossless fixture packing: consecutive same-colour pixel writes become
    # ['pixels', colour, [x0, y0, x1, y1, ...]] (the spec packs the same way).
    out = []
    for c in sequence:
        if c[0] == 'pixel' and out and out[-1][0] == 'pixels' and out[-1][1] == c[3]: out[-1][2].extend(c[1:3])
        elif c[0] == 'pixel': out.append(['pixels', c[3], list(c[1:3])])
        else: out.append(c)
    return out

def call(entry, this, values):
    sp = stack + 0xf000 - 4 * len(values)
    for i, v in enumerate(values): write(sp + 4 + 4 * i, v)
    write(sp, stop)
    cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, this)
    cpu.emu_start(entry, stop, count=2000000)
    if cpu.reg_read(UC_X86_REG_EIP) != stop: raise RuntimeError(f'{entry:x} did not finish')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

TEAM = 3
COLORS = {n: 0xa0 + n for n in range(1, 10)}
def setup_scene(case):
    cpu.mem_write(scene, bytes(0x20000))
    write(scene + 8, renderer); write(scene + 0x1c, service); write(scene + 0xac, bitmap)
    for n, value in COLORS.items(): write(scene + 0x12434 + 4 * n, value)
    for slot in range(1, 71):
        for variant in (0, 1):
            present = (slot, variant) not in case['missingIcons']
            write(scene + 0xb8 + slot * 8 + variant * 4, 0x40000000 + slot * 2 + variant if present else 0)
        weapon = case['weapons'][slot]
        entry = scene + 0x125bc + slot * 0x208
        cpu.mem_write(entry + 4, weapon['name'].encode('latin-1') + b'\0')
        write(entry + 0x48, weapon['category']); write(entry + 0x68, weapon['kind'])
        write(entry + 0x6c, weapon['subtype']); write(entry + 0x74, weapon['flagBit'])
    state.update(ammo=[0] + [case['ammo'][s] for s in range(1, 71)] + [0] * 8,
                 delay=[0] + [case['delay'][s] for s in range(1, 71)] + [0] * 8,
                 flags=case['flags'], bitmap=case['bitmap'], fontHeight=case['fontHeight'])

def widget_state():
    return dict(width=sread(widget + 0xc), height=sread(widget + 0x10), hover=[sread(widget + 0x14), sread(widget + 0x18)],
                pointer=[sread(widget + 0x1c), sread(widget + 0x20)], labelX=sread(widget + 0x24),
                cellLeft=sread(widget + 0x28), cellTop=sread(widget + 0x2c),
                grid=[sread(widget + 0x30 + 4 * i) for i in range(65)],
                rowCategories=[sread(widget + 0x134 + 4 * i) for i in range(13)],
                cols=sread(widget + 0x168), rows=sread(widget + 0x16c))

# Representative weapon table: twelve categories with up to seven entries
# so the five-per-row cap is exercised, plus category 0 and an out-of-range
# category that the measure loop never visits. Utilities 62..70 sit in
# category 12; slots 63..70 are kind 4 / subtype 0x13 with team flag bits.
def weapon_table(rng):
    table = {}
    for slot in range(1, 71):
        category = 12 if slot >= 62 else (slot - 1) % 12 + 1
        if slot in (5, 17): category = 0
        if slot == 29: category = 13
        kind, subtype, bit = (4, 0x13, slot - 63) if slot >= 63 else (rng.choice([1, 2, 3, 4]), rng.choice([0, 0x13, 2]), rng.randrange(8))
        table[slot] = dict(name=f'Weapon {slot}' if slot % 9 else f'Long weapon name {slot}', category=category,
                           kind=kind, subtype=subtype, flagBit=bit)
    return table

def make_case(name, rng, ammo, delay, flags=0, bitmap=(640, 480), fontHeight=16, missing=()):
    weapons = weapon_table(rng)
    return dict(name=name, weapons=weapons, ammo={s: ammo(s) for s in range(1, 71)}, delay={s: delay(s) for s in range(1, 71)},
                flags=flags, bitmap=list(bitmap), fontHeight=fontHeight, missingIcons=set(missing))

rng = random.Random(1999)
cases = [
    make_case('empty', rng, lambda s: 0, lambda s: 0),
    make_case('full infinite', rng, lambda s: -1, lambda s: 0),
    make_case('full counted', rng, lambda s: [1, 2, 5, 9, 10, 99, 100, 1000][s % 8], lambda s: 0),
    make_case('all delayed', rng, lambda s: 0, lambda s: 1 + s % 4),
    make_case('single bazooka', rng, lambda s: -1 if s == 1 else 0, lambda s: 0),
    make_case('category zero only', rng, lambda s: 3 if s in (5, 17) else 0, lambda s: 0),
    make_case('utilities active', rng, lambda s: 2 if s >= 60 else 0, lambda s: 0, flags=0b10110101),
    make_case('small bitmap clamps', rng, lambda s: -1, lambda s: 0, bitmap=(120, 90)),
    make_case('missing icons', rng, lambda s: 1, lambda s: 2 if s % 5 == 0 else 0,
              missing=[(s, v) for s in range(1, 71) for v in (0, 1) if (s + v) % 3 == 0]),
    make_case('short font', rng, lambda s: 4 if s % 2 else 0, lambda s: 0, fontHeight=9),
]
for seed in range(8):
    r = random.Random(seed)
    cases.append(make_case(f'random {seed}', r, lambda s, r=r: r.choice([0, 0, 0, -1, 1, 2, 3, 99, 100, -5]),
                           lambda s, r=r: r.choice([0] * 6 + [1, 2, -1]), flags=r.randrange(256),
                           fontHeight=r.choice([13, 16, 20]), missing=[(s, v) for s in range(1, 71) for v in (0, 1) if r.random() < 0.05]))

out = []
for case in cases:
    setup_scene(case)
    cpu.mem_write(widget, bytes(0x200))
    write(widget + 0x24, 0x7777)  # not initialized by the constructor
    for i in range(65): write(widget + 0x30 + 4 * i, 0x5555)
    for i in range(13): write(widget + 0x134 + 4 * i, 0x6666)
    write(0x56faf8, 0)
    calls.clear(); call(0x500170, widget, [scene, TEAM])
    assert read(0x56faf8) == label_text and not calls
    constructed = widget_state()
    ops = []
    # Selection straight after construction reads the zeroed pointer.
    calls.clear(); ops.append(dict(op=['selection'], result=call(0x500fd0, widget, []), calls=packed(calls)))
    size_out = stubs + 0x4000
    write(size_out, 0x1111); write(size_out + 4, 0x2222)
    calls.clear(); call(0x500b20, widget, [size_out, size_out + 4])
    ops.append(dict(op=['measure'], result=[sread(size_out), sread(size_out + 4)], calls=packed(calls), state=widget_state()))
    r = random.Random(case['name'])
    script = []
    for x, y in [(0, 0), (-50, -50), (36, 4), (64, 32), (65, 33), (93, 61), (35, 3), (500, 500), (180, 24), (37, 400)]:
        for dc, dr in [(0, 0), (1, 0), (0, 1), (-1, -1), (7, -9)]:
            script.append(['layout', x, y, dc, dr])
    st = widget_state()
    points = [(36 + 29 * c + dx, 4 + 29 * row + dy) for row in range(max(st['rows'], 1) + 1) for c in range(6) for dx, dy in [(0, 0), (27, 28)]]
    points += [(0, 0), (-100, -100), (1000, 1000), (36, 4), (36, 4), (64, 33)] + [(r.randrange(-40, 260), r.randrange(-40, 420)) for _ in range(20)]
    for x, y in points:
        script.append(['position', x, y]); script.append(['selection'])
    script.append(['measure']); script.append(['selection']); script.append(['position', 36 + 29, 4 + 29]); script.append(['selection'])
    for op in script:
        calls.clear()
        if op[0] == 'layout':
            write(size_out, op[1]); write(size_out + 4, op[2])
            call(0x500960, widget, [size_out, size_out + 4, op[3], op[4]])
            result = [sread(size_out), sread(size_out + 4)]
        elif op[0] == 'position':
            call(0x500a40, widget, [op[1], op[2]]); result = None
        elif op[0] == 'selection':
            result = call(0x500fd0, widget, [])
        else:
            write(size_out, 0x1111); write(size_out + 4, 0x2222)
            call(0x500b20, widget, [size_out, size_out + 4]); result = [sread(size_out), sread(size_out + 4)]
        entry = dict(op=op, result=result, calls=packed(calls))
        if op[0] == 'measure': entry['state'] = widget_state()
        elif op[0] == 'position':
            st = widget_state(); entry['state'] = dict(hover=st['hover'], pointer=st['pointer'])
        ops.append(entry)
    out.append(dict(name=case['name'], weapons=[None] + [case['weapons'][s] for s in range(1, 71)],
                    ammo=state['ammo'][:71], delay=state['delay'][:71], flags=case['flags'], bitmap=case['bitmap'],
                    fontHeight=case['fontHeight'], missingIcons=sorted([list(m) for m in case['missingIcons']]),
                    constructed=constructed, ops=ops))

# 004FFFE0 team status strip created by 004E5380 with
# (scene+0x2B0, 8, 2, 2, 30, 30, colour(7), colour(8)).
strips = []
icons = scene + 0x2b0
for missing in [(), (1, 4), tuple(range(8))]:
    setup_scene(cases[0])
    for i in missing: write(icons + 8 * i, 0)
    cpu.mem_write(strip, bytes(0x40))
    # Fields stored by 004FFED0 (ported in controller-visual-resources.js);
    # its 00492BC0 image is replaced by the recording bitmap stub.
    for o, v in [(0, 0x5277c0), (0x1c, 2), (0x20, 2), (0x24, 30), (0x28, 30), (0x34, icons), (0x18, 8),
                 (0x10, COLORS[7]), (0x14, COLORS[8]), (0x2c, 28), (0x30, 28), (0x38, bitmap)]:
        write(strip + o, v)
    for mask in [0, 1, 1, 0x80, 0xff, 0xff, 0x100, 0x1ff, 0x5a, 0xffffffff, 0x5a]:
        size_out = stubs + 0x4000
        write(size_out, 0x1111); write(size_out + 4, 0x2222)
        calls.clear(); result = call(0x4fffe0, strip, [mask, size_out, size_out + 4])
        strips.append(dict(missing=list(missing), mask=mask, result=0 if result == 0 else 'image',
                           size=[sread(size_out), sread(size_out + 4)], calls=packed(calls),
                           cache=[sread(strip + 0xc), sread(strip + 4), sread(strip + 8)]))

# Real 8-bit bitmap class 005249B0 (the class of scene+0xAC, created
# 256x480 by 004A5A6B): replay recorded primitive requests through its
# rect 00493130, horizontal 00493260, vertical 00493310 and pixel 0048B780
# to pin the end-point conventions. Images and text are host-drawn.
raster_bitmap, raster_pixels = stubs + 0x5000, 0x2500000
cpu.mem_map(raster_pixels, 0x20000)
fields = [(0, 0x5249b0), (8, raster_pixels), (12, 8), (0x10, 256), (0x14, 256), (0x18, 480), (0x1c, 0), (0x20, 0), (0x24, 256), (0x28, 480)]
primitives = {'rect': 0x493130, 'horizontal': 0x493260, 'vertical': 0x493310, 'pixel': 0x48b780}
rasters = []
for name in ['full counted', 'utilities active', 'missing icons', 'empty']:
    case = next(c for c in out if c['name'] == name)
    requests = []
    for op in case['ops']:
        if op['op'][0] in ('measure', 'position'):
            for c in op['calls']:
                if c[0] == 'pixels': requests += [['pixel', c[2][i], c[2][i + 1], c[1]] for i in range(0, len(c[2]), 2)]
                elif c[0] in primitives: requests.append(c)
    requests = requests[:6000]
    cpu.mem_write(raster_pixels, bytes(256 * 480))
    for o, v in fields: write(raster_bitmap + o, v)
    for r in requests: call(primitives[r[0]], raster_bitmap, r[1:])
    width, height = case['ops'][1]['result']
    pixels = bytes(cpu.mem_read(raster_pixels, 256 * 480))
    rasters.append(dict(name=name, requests=len(requests), width=width, height=height,
                        pixels=b''.join(pixels[y * 256:y * 256 + width] for y in range(height)).hex()))

args.output.write_text(json.dumps(dict(
    executable_sha256=digest,
    routines='00500170 constructor, 00500B20 measure, 00500960 layout, 00500A40 position (00500290 cell, 005006B0 name), 00500FD0 selection, 004FFFE0 team status strip',
    method='Original routines with real 0049BF90/004AA8F0/004AA990; stubbed 004C2EE0 ammo, 004C3050 delay, 004C29C0 team flags, sprintf, renderer text/font height and bitmap primitives recorded in call order. Icon handles are 0x40000000+slot*2+variant (scene+0xB8 lo/hi pairs), 0 when missing; palette colour(n) = 0xA0+n.',
    team=TEAM, colors={str(k): v for k, v in COLORS.items()}, cases=out, strips=strips, rasters=rasters), separators=(',', ':')) + '\n')
print(f'Captured {len(out)} arsenal cases ({sum(len(c["ops"]) for c in out)} operations) and {len(strips)} strip cases')
