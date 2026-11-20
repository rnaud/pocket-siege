"""Execute the original CPU-team AI movement and safety routines (WA 3.0.0.0).

Reachable positions are found by a pathfinder object at scene+0x7D8
(0x4A58 bytes): 004C8920 seeds it from the worm's spot and recursively walks
both ways (004C8100) with the worm's own walk routine 004F4D80, drops off
ledges, and from 16 steps before a wall or hazard tries four jumps simulated by
004C7CF0. Every 16th visited spot is recorded by 004C7710 with its move stack
(compressed to 5-byte [x, y, action] steps) in the AI path buffer. The AI
wraps it as 004CE690 (list AI+0x20F0, fresh buffer) and 004CE730 (list
AI+0x24F4, appended after the first list's paths). 004D0170/004CFD20/004CFF20
(state 0x66, body 004D0130) follow a path with walk/jump action codes.
004CED90/004CEEC0/004CEFD0 measure drowning exposure, 004CEA30 scores a spot,
004CE920 chooses one, 004CEC90 detects imminent explosions and 004F3E50
(state 0x6A) retreats from the planned impact.

Executed unchanged: everything above plus the worm body methods of vtable
00527548 (walk 004F4D80, collision test 004D1230, motion test 004D11E0,
teleport 004D1260, position, state, flags), team-data health getter,
trig and fixed math.

Substituted interfaces, all reading data memory: world collision of the worm
body (scene+0x7D4 vtable+0xC; the harness's own box test over a heightmap
and rectangles), gravity (scene+0x7D4 vtable+0x24), task registry iteration
(scene+0x7D4 vtable+0x48/+0x4C), other tasks' type/message/position methods
(vtable+0x50/+0xC/+0x5C), the landscape pixel test (scene+0x24 vtable+0x28)
and the coroutine yield 004F0D40 (AI vtable+0x28).
"""
import argparse
import hashlib
import json
import random
import struct
from pathlib import Path
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_ECX, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX

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
    _, rva, vsize, offset = struct.unpack_from('<IIII', data, headers + 40 * i + 8)
    if vsize: cpu.mem_write(base + rva, data[offset:offset + vsize])

OBJ, STACK, STOP, STUBS, DATA, PFO, CTX = 0x2000000, 0x2100000, 0x2200000, 0x2300000, 0x2400000, 0x2600000, 0x3000000
for address, length in [(OBJ, 0x4000), (STACK, 0x10000), (STOP, 0x1000), (STUBS, 0x1000), (DATA, 0x10000),
                        (PFO, 0x5000), (CTX, 0x30000)]:
    cpu.mem_map(address, length)
cpu.mem_write(STUBS, b'\xc3' * 0x1000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000
def sread(address): return signed(read(address))
def s16(address): return struct.unpack('<h', cpu.mem_read(address, 2))[0]

TD = CTX + 0x1b94
def worm_addr(team, worm): return TD + team * 0x51c + worm * 0x9c
S = {name: STUBS + 0x10 * i for i, name in enumerate([
    'collide', 'gravity', 'first', 'next', 'type', 'msg', 'position', 'pixel', 'yield'])}
REG, REGVT, LIST, LAND, LANDVT, TASKVT, WORM, TASKS, FLAMES = (DATA + 0x100, DATA + 0x180, DATA + 0x400, DATA + 0x600,
                                                              DATA + 0x680, DATA + 0x700, DATA + 0x800, DATA + 0x2000,
                                                              DATA + 0x8000)
WORM_VTABLE = 0x527548  # real physics-body vtable (walk, collision, teleport ... execute unchanged)
write(REG, REGVT); write(REGVT + 0xc, S['collide']); write(REGVT + 0x24, S['gravity'])
write(REGVT + 0x48, S['first']); write(REGVT + 0x4c, S['next'])
write(LAND, LANDVT); write(LANDVT + 0x28, S['pixel'])
write(TASKVT + 0x50, S['type']); write(TASKVT + 0xc, S['msg']); write(TASKVT + 0x5c, S['position'])

env = {}
calls = []
def fnv(h, v):
    for b in struct.pack('<i', v): h = ((h ^ b) * 0x01000193) & 0xffffffff
    return h

class Terrain:
    """Harness landscape: ground below heights[x], solid rectangles, walls outside [0, width)."""
    def __init__(self, heights, rects):
        self.h, self.rects, self.w = heights, rects, len(heights)
    def pixel(self, x, y):
        if x < 0 or x >= self.w: return 1
        if y >= self.h[x]: return 1
        return int(any(r[0] <= x <= r[2] and r[1] <= y <= r[3] for r in self.rects))
    def box(self, x, y):  # worm body: x-4..x+4, y-6..y+6 (harness choice, the live host supplies its own)
        cx, cy = x >> 16, y >> 16
        x0, x1, y0, y1 = cx - 4, cx + 4, cy - 6, cy + 6
        if x0 < 0 or x1 >= self.w: return 1
        if min(self.h[x0:x1 + 1]) <= y1: return 1
        return int(any(r[0] <= x1 and x0 <= r[2] and r[1] <= y1 and y0 <= r[3] for r in self.rects))

def ret(nargs, result=0):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    cpu.reg_write(UC_X86_REG_EAX, result & 0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP, sp + 4 + 4 * nargs)
    cpu.reg_write(UC_X86_REG_EIP, read(sp))

def hook(cpu, address, size, user):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    ecx = cpu.reg_read(UC_X86_REG_ECX)
    arg = lambda i: signed(read(sp + 4 + 4 * i))
    if address == S['collide']:
        body, x, y = arg(0), arg(1), arg(2)
        if body & 0xffffffff != WORM: raise RuntimeError('collision for another body')
        env['probes'] += 1; env['probeHash'] = fnv(fnv(env['probeHash'], x), y)
        ret(3, env['terrain'].box(x, y))
    elif address == S['pixel']:
        x, y = arg(0), arg(1)
        env['pixels'] += 1; env['pixelHash'] = fnv(fnv(env['pixelHash'], x), y)
        ret(2, env['terrain'].pixel(x, y))
    elif address == S['gravity']: ret(0, read(DATA + 0x24))
    elif address in (S['first'], S['next']):
        task_out, it = arg(0) & 0xffffffff, arg(1) & 0xffffffff
        index = 0 if address == S['first'] else read(it)
        if index < read(LIST):
            write(task_out, read(LIST + 4 + 4 * index)); write(it, index + 1); ret(2, 1)
        else: ret(2, 0)
    elif address == S['type']: ret(0, read(ecx + 0x10))
    elif address == S['position']:
        write(arg(0) & 0xffffffff, read(ecx + 0x14)); write(arg(1) & 0xffffffff, read(ecx + 0x18)); ret(2, 1)
    elif address == S['msg']:
        msg, length, buf = arg(0), arg(1), arg(2) & 0xffffffff
        if msg == 0x7d3:
            cpu.mem_write(buf, bytes(cpu.mem_read(ecx + 0x40, length))); ret(3, 1)
        elif msg == 0x7d5: ret(3, read(ecx + 0x28))
        elif msg == 0x7d6: ret(3, read(ecx + 0x2c))
        else: raise RuntimeError(f'message {msg:#x}')
    elif address == S['yield']:
        env['yields'] += 1
        # Data-driven abort: the worm starts moving after a given number of yields.
        if env.get('moveAfter') is not None and env['yields'] >= env['moveAfter']: write(WORM + 0x9c, 0x100)
        ret(0, 0)
    else: raise RuntimeError(hex(address))
for address in S.values(): cpu.hook_add(UC_HOOK_CODE, hook, begin=address, end=address)
REDIRECT = {0x4f0d40: S['yield']}
def redirect(cpu, address, size, user): hook(cpu, REDIRECT[address], size, user)
for address in REDIRECT: cpu.hook_add(UC_HOOK_CODE, redirect, begin=address, end=address)

def run(address, stack_args=(), this=OBJ):
    sp = STACK + 0xf000
    for i, value in enumerate([STOP, *stack_args]): write(sp + 4 * i, value)
    cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, this)
    try: cpu.emu_start(address, STOP, count=500000000)
    except Exception as error: raise RuntimeError(f'{address:#x} faulted at {cpu.reg_read(UC_X86_REG_EIP):#x}') from error
    if cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError(f'{address:#x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

AI_FIELDS = dict(team=0xd4, state=0xe0, nextState=0xe4, action=0xec, used=0x28f4, count2=0x28f8,
                 target0=0x2904, target1=0x2908, jumpIssued=0x290c, cursor=0x2910, step=0x2914, fromX=0x2918,
                 fromY=0x291c, toX=0x2920, toY=0x2924, stall=0x2928, failures=0x292c, field2930=0x2930,
                 delay=0x2934, replanned=0x2948, impactX=0x2994, impactY=0x2998, count1=0x24f0)
def ai_snapshot(): return {name: sread(OBJ + off) for name, off in AI_FIELDS.items()}

def reset(terrain, worm, scene=None, ai=None, tasks=(), mines=(), flames=(), teams=None):
    """worm: dict(x, y, state, flags, moving). tasks: other registry entries."""
    global calls
    calls = []
    cpu.mem_write(OBJ, b'\0' * 0x4000); cpu.mem_write(CTX, b'\0' * 0x30000); cpu.mem_write(PFO, b'\0' * 0x5000)
    cpu.mem_write(DATA + 0x800, b'\0' * 0xf800)
    write(OBJ, 0x526958); write(OBJ + 0x38, CTX); write(OBJ + 0x2dc0, WORM)
    write(CTX + 0x7d4, REG); write(CTX + 0x7d8, PFO); write(CTX + 0x24, LAND); write(PFO + 0x4a54, CTX)  # pathfinder scene link (constructor field)
    env.clear(); env.update(terrain=terrain, probes=0, probeHash=0x811c9dc5, pixels=0, pixelHash=0x811c9dc5, yields=0)
    for offset, value in (scene or {}).items(): write(CTX + offset, value)
    for name, value in (ai or {}).items(): write(OBJ + AI_FIELDS[name], value)
    write(WORM, WORM_VTABLE); write(WORM + 0x38, CTX); write(WORM + 0x3c, 2); write(WORM + 0x40, worm.get('flags', 0))
    write(WORM + 0x50, worm.get('state', 0x65)); write(WORM + 0x90, worm['x']); write(WORM + 0x94, worm['y'])
    write(WORM + 0x9c, worm.get('moving', 0))
    entries = [WORM]
    for i, t in enumerate(list(tasks) + list(mines)):
        task = TASKS + i * 0x80
        write(task, TASKVT); write(task + 0x10, t.get('type', 10)); write(task + 0x14, t['x']); write(task + 0x18, t['y'])
        write(task + 0x28, t.get('m7d5', 0)); write(task + 0x2c, t.get('m7d6', 0))
        write(task + 0x40, t.get('team', 0)); write(task + 0x44, t.get('worm', 0))
        if i < len(tasks): entries.insert(t.get('slot', len(entries)), task)
        else: write(CTX + 0x450 + 4 * t['index'], task)
    write(LIST, len(entries))
    for i, task in enumerate(entries): write(LIST + 4 + 4 * i, task)
    for i, f in enumerate(flames):
        obj = FLAMES + i * 0x60
        write(obj + 0x4c, f['x']); write(obj + 0x50, f['y']); write(CTX + 0x4b0 + 4 * f['index'], obj)
    for team, t in (teams or {}).items():
        for w, hp in t.items(): write(worm_addr(team, w) - 0x538, hp)

rng = random.Random(0x6d6f7665)
FX = 1 << 16
cases = {}

def random_terrain(width=None, smooth=False):
    w = width or rng.randint(220, 520)
    h, level = [], rng.randint(240, 340)
    slope = 0
    for x in range(w):
        if rng.random() < (0.02 if smooth else 0.06): slope = rng.choice([-1, 0, 0, 1] if smooth else [-2, -1, 0, 0, 1, 2])
        if rng.random() < (0.004 if smooth else 0.02): level += rng.choice([-12, -6, 6, 12, 25, -25])
        elif rng.random() < 0.5: level += slope
        level = max(120, min(420, level))
        h.append(level)
    rects = []
    for _ in range(rng.randint(0, 5)):
        x = rng.randint(0, w - 10); y = rng.randint(140, 380)
        rects.append([x, y, x + rng.randint(3, 80), y + rng.randint(2, 30)])
    return Terrain(h, rects)
def standing(t, cx):
    for cy in range(0, 460):
        if not t.box(cx << 16, cy << 16) and t.box(cx << 16, (cy + 1) << 16): return cy
    return None
def ground_spot(t, margin=12):
    for _ in range(200):
        cx = rng.randint(margin, t.w - margin - 1); cy = standing(t, cx)
        if cy is not None: return cx, cy
    raise RuntimeError('no ground')
def buffer_hex():  # AI path buffer (AI+0xF0) without its trailing zero bytes
    return bytes(cpu.mem_read(OBJ + 0xf0, 0x2000)).rstrip(b'\0').hex()
def terrain_json(t): return dict(heights=t.h, rects=t.rects)
def hazards(cx, cy):
    flames = [dict(index=rng.randint(0, 199), x=(cx + rng.randint(-120, 120)) * FX + rng.randint(0, 0xffff),
                   y=(cy + rng.randint(-40, 40)) * FX) for _ in range(rng.choice([0, 0, 1, 3, 6]))]
    flames = list({f['index']: f for f in flames}.values())
    mines = [dict(index=rng.randint(0, 23), x=(cx + rng.randint(-150, 150)) * FX, y=(cy + rng.randint(-40, 40)) * FX,
                  m7d5=rng.choice([0, 0, 0, 1])) for _ in range(rng.choice([0, 0, 1, 2, 4]))]
    mines = list({m['index']: m for m in mines}.values())
    return flames, mines

# 1. Reachable positions 004CE690 -> 004C8920 (and 004CE730 continuing an existing buffer).
flood = []
for n in range(64):
    t = (random_terrain(rng.randint(2600, 3200), True) if n % 16 == 9 else
         random_terrain(rng.randint(900, 1600), True) if n % 5 == 1 else random_terrain())
    cx, cy = ground_spot(t)
    x = cx * FX + (rng.randint(0, 0xffff) if rng.random() < 0.4 else 0); y = cy * FX
    flames, mines = hazards(cx, cy)
    worm = dict(x=x, y=y, state=rng.choice([0x65] * 8 + [0x67, 0x66]), flags=rng.choice([0, 0x1800, 0x1813, 0x10]),
                moving=rng.choice([0] * 12 + [1]))
    scene = {0x804: max(t.h) + rng.randint(20, 60) if rng.random() < 0.7 else rng.choice([max(t.h) + rng.randint(-60, 0), 300])}
    gravity = rng.choice([0x3d70, 0x3d70, 0x3d70, 0x2000, 0x6000, 0x9000])
    second = n % 4 == 3
    flag = rng.choice([0] * 9 + [1])
    reset(t, worm, scene, flames=flames, mines=mines)
    write(DATA + 0x24, gravity)
    cpu.mem_write(OBJ + 0x2ca2, bytes([flag]))
    if rng.random() < 0.15: env['moveAfter'] = rng.randint(1, 6)
    prior = 0
    if second:
        prior = rng.choice([0, 40, 0x1f00, 0x1ff8, 900]); write(OBJ + 0x28f4, prior)
        cpu.mem_write(OBJ + 0xf0, bytes(rng.getrandbits(8) for _ in range(prior)))
    yx, yy = (x, y) if rng.random() < 0.9 else (x + rng.randint(-3, 3) * FX, y + rng.randint(-2, 2) * FX)
    result = run(0x4ce730 if second else 0x4ce690, [yx, yy])
    lst, cnt = (OBJ + 0x24f4, OBJ + 0x28f8) if second else (OBJ + 0x20f0, OBJ + 0x24f0)
    count = sread(cnt)
    spots = [[s16(lst + 8 * i), s16(lst + 8 * i + 2), sread(lst + 8 * i + 4)] for i in range(max(0, count))]
    flood.append(dict(terrain=terrain_json(t), worm=worm, scene=scene, gravity=gravity, flames=flames, mines=mines,
                      flag=flag, second=second, prior=prior, moveAfter=env.get('moveAfter'), args=[yx, yy],
                      result=result, count=count, spots=spots, used=sread(OBJ + 0x28f4),
                      buffer=buffer_hex(),
                      wormFlags=sread(WORM + 0x40), aborted=sread(PFO + 0x460c), dropHeight=sread(PFO + 0x4a48),
                      yields=env['yields'], probes=env['probes'], probeHash=env['probeHash']))
    print('flood', n, count, env['probes'], flush=True)
cases['flood'] = flood

# 2. Path following: 004D0170 start, then 004D0130 (state 0x66 body: 004CFF20/004CFD20) per think step with
#    scripted worm state and position. 004D02C0 clears the action word before each step.
walk = []
sources = [i for i, c in enumerate(flood) if c['count'] > 1 and not c['second']]
for n in range(160):
    source = rng.choice(sources); src = flood[source]
    t = Terrain(src['terrain']['heights'], src['terrain']['rects'])
    spot = rng.choice(src['spots'][1:]) if rng.random() < 0.9 else rng.choice(src['spots'])
    worm = dict(x=src['worm']['x'], y=src['worm']['y'], state=0x65)
    reset(t, worm, src['scene'])
    cpu.mem_write(OBJ + 0xf0, bytes.fromhex(src['buffer']))
    rec = DATA + 0x7f0
    cpu.mem_write(rec, struct.pack('<hhi', spot[0], spot[1], spot[2]))
    next_state = rng.choice([100, 0x6a, 0x67, 0x7b])
    failures = rng.choice([0, 0, 2, 6]); write(OBJ + 0x292c, failures)
    started = run(0x4d0170, [next_state, rec])
    steps = []
    # Decode the path to script positions that follow it, with noise and failures.
    raw = bytes.fromhex(src['buffer']).ljust(0x2000, b'\0'); off = spot[2]; moves = []
    while True:
        mx, my, act = struct.unpack_from('<hhb', raw, off); moves.append((mx, my, act)); off += 5
        if act == 0: break
    afterStart = ai_snapshot()
    px, py = worm['x'], worm['y']; target = 0
    for k in range(rng.randint(5, 90)):
        st = rng.choice([0x65] * 5 + [0x66] * 4 + [0x67, 0x68, 0x6f, 0x7a])
        if rng.random() < 0.7 and target < len(moves):
            gx, gy = (moves[min(target + 1, len(moves) - 1)][:2])
            jitter = rng.choice([0, 0, 1, 2, 4, 8, 40])
            px = (gx + rng.randint(-jitter, jitter)) * FX + rng.randint(0, 0xffff); py = (gy + rng.randint(-jitter, jitter)) * FX
            if rng.random() < 0.5: target += 1
        elif rng.random() < 0.3:
            px += rng.randint(-3, 3) * FX
        write(WORM + 0x50, st); write(WORM + 0x90, px); write(WORM + 0x94, py)
        write(OBJ + 0xec, 0)
        run(0x4d0130)
        steps.append(dict(state=st, x=px, y=py, ai=ai_snapshot(), wormX=sread(WORM + 0x90), wormY=sread(WORM + 0x94)))
    walk.append(dict(source=source, spot=spot, start=worm,
                     nextState=next_state, failures=failures, started=started, afterStart=afterStart, steps=steps))
cases['walk'] = walk

# 3. Landscape probes: 004CED90 ring test, 004CEEC0 step, 004CEFD0 drowning exposure.
land = []
for n in range(400):
    t = random_terrain(rng.choice([rng.randint(80, 300), rng.randint(500, 800)]), rng.random() < 0.5)
    kind = rng.choice(['ring', 'step', 'escape', 'escape'])
    cx = rng.randint(-5, t.w + 5); cy = rng.randint(100, 460)
    if rng.random() < 0.6 and 0 <= cx < t.w: cy = t.h[cx] - rng.randint(-2, 6)
    water = rng.choice([max(t.h) - rng.randint(0, 80), 470, t.h[min(max(cx, 0), t.w - 1)] + rng.randint(-3, 30)])
    reset(t, dict(x=0, y=0), {0x804: water})
    if kind == 'ring':
        r = run(0x4ced90, [LAND, cx, cy]); out = None
    elif kind == 'step':
        dir_ = rng.choice([-1, 1]); climb = rng.choice([1, 3, 5, 8])
        write(DATA + 0x7e0, cx); write(DATA + 0x7e4, cy)
        r = run(0x4ceec0, [LAND, DATA + 0x7e0, DATA + 0x7e4, dir_, climb]); out = [sread(DATA + 0x7e0), sread(DATA + 0x7e4)]
        cx, cy = [cx, cy, dir_, climb], None
    else:
        dir_ = rng.choice([-1, 1]); r = run(0x4cefd0, [cx, cy, dir_]); out = None; cx = [cx, cy, dir_]; cy = None
    land.append(dict(kind=kind, terrain=terrain_json(t), water=water, args=cx if cy is None else [cx, cy], result=r,
                     out=out, pixels=env['pixels'], pixelHash=env['pixelHash']))
cases['land'] = land

# 4. Spot scoring 004CEA30, chooser 004CE920, imminent explosion test 004CEC90.
def random_tasks(cx, cy, team):
    tasks = []
    for _ in range(rng.randint(0, 7)):
        ty = rng.choice([2, 2, 10, 10, 15, 17, 3, 12])
        tasks.append(dict(type=ty, x=(cx + rng.randint(-300, 300)) * FX + rng.randint(0, 0xffff),
                          y=(cy + rng.randint(-80, 80)) * FX + rng.randint(0, 0xffff),
                          team=rng.choice([team, team, rng.randint(0, 3)]), worm=rng.randint(1, 4),
                          m7d5=rng.choice([0, 0, 1]), m7d6=rng.choice([0, 0, 1])))
    for i, task in enumerate(tasks): task['slot'] = rng.randint(0, i + 1)
    return tasks
def random_teams():
    return {t: {w: rng.choice([0, 0, 5, 100, 150]) for w in range(1, 5)} for t in range(4)}
score, choose, imminent = [], [], []
for n in range(560):
    t = random_terrain(rng.randint(200, 400))
    cx, cy = ground_spot(t)
    team = rng.randint(0, 3)
    tasks = random_tasks(cx, cy, team); teams = random_teams()
    water = rng.choice([max(t.h) + rng.randint(-60, 20), 470])
    worm = dict(x=cx * FX + rng.randint(0, 0xffff), y=cy * FX)
    reset(t, worm, {0x804: water}, dict(team=team), tasks=tasks, teams=teams)
    common = dict(terrain=terrain_json(t), water=water, team=team, worm=worm, tasks=tasks, teams=teams)
    which = n % 4
    if which == 0 or which == 1:
        sx, sy = ground_spot(t)
        ownx = worm['x'] if rng.random() < 0.8 else rng.randint(0, 400) * FX
        owny = worm['y'] if rng.random() < 0.8 else rng.randint(100, 460) * FX
        r = run(0x4cea30, [ownx, owny, sx * FX, sy * FX])
        score.append(dict(common, args=[ownx, owny, sx * FX, sy * FX], result=r, pixels=env['pixels'], pixelHash=env['pixelHash']))
    elif which == 2:
        records = []
        for _ in range(rng.choice([0, 1, 3, 6, 12])):
            sx, sy = ground_spot(t); records.append([sx, sy, rng.randint(0, 0x1ff0)])
        for i, r_ in enumerate(records): cpu.mem_write(DATA + 0x7000 + 8 * i, struct.pack('<hhi', *r_))
        ix = (cx + rng.randint(-200, 200)) * FX + rng.randint(0, 0xffff); iy = (cy + rng.randint(-50, 50)) * FX
        flags = rng.choice([0, 1, 2, 3])
        r = run(0x4ce920, [DATA + 0x7000, len(records), ix, iy, flags])
        choose.append(dict(common, records=records, impact=[ix, iy], flags=flags, result=r))
    else:
        r = run(0x4cec90)
        imminent.append(dict(common, result=r))
cases['score'] = score; cases['choose'] = choose; cases['imminent'] = imminent

# 5. Retreat state 0x6A (004F3E50): rebuild the second list, choose the safest spot away from the impact, follow.
retreat = []
for n in range(40):
    t = random_terrain()
    cx, cy = ground_spot(t)
    team = rng.randint(0, 3)
    tasks = random_tasks(cx, cy, team); teams = random_teams()
    flames, mines = hazards(cx, cy)
    worm = dict(x=cx * FX, y=cy * FX, state=rng.choice([0x65] * 6 + [0x67, 0x68]))
    water = rng.choice([max(t.h) + rng.randint(-60, 20), 470])
    gravity = 0x3d70
    ai = dict(team=team, state=0x6a, impactX=(cx + rng.randint(-120, 120)) * FX, impactY=(cy + rng.randint(-40, 40)) * FX,
              used=rng.choice([0, 0, 300]))
    reset(t, worm, {0x804: water}, ai, tasks=tasks, flames=flames, mines=mines, teams=teams)
    write(DATA + 0x24, gravity)
    run(0x4f3e50)
    count = sread(OBJ + 0x28f8)
    spots = [[s16(OBJ + 0x24f4 + 8 * i), s16(OBJ + 0x24f4 + 8 * i + 2), sread(OBJ + 0x24f4 + 8 * i + 4)] for i in range(max(0, count))]
    retreat.append(dict(terrain=terrain_json(t), worm=worm, water=water, gravity=gravity, ai=ai, tasks=tasks, teams=teams,
                        flames=flames, mines=mines, out=ai_snapshot(), spots=spots,
                        buffer=buffer_hex(),
                        yields=env['yields'], probes=env['probes'], pixels=env['pixels']))
    print('retreat', n, count, flush=True)
cases['retreat'] = retreat

# 6. Hazard flee prologue of 004CD460 (stopped where it falls through to normal planning at 004CD584).
def stop_hook(cpu, address, size, user):
    env['fellThrough'] = True; cpu.emu_stop()
cpu.hook_add(UC_HOOK_CODE, stop_hook, begin=0x4cd584, end=0x4cd584)
flee = []
for n in range(60):
    t = random_terrain()
    cx, cy = ground_spot(t)
    team = rng.randint(0, 3)
    tasks = random_tasks(cx, cy, team); teams = random_teams()
    worm = dict(x=cx * FX + rng.randint(0, 0xffff), y=cy * FX, state=0x65)
    water = rng.choice([max(t.h) + rng.randint(-60, 20), 470])
    ai = dict(team=team, state=100)
    reset(t, worm, {0x804: water}, ai, tasks=tasks, teams=teams)
    write(DATA + 0x24, 0x3d70)
    env['fellThrough'] = False
    sp = STACK + 0xf000
    write(sp, STOP); cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, OBJ)
    cpu.emu_start(0x4cd460, STOP, count=500000000)
    handled = 0 if env['fellThrough'] else 1
    if handled and cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError('flee did not return')
    flee.append(dict(terrain=terrain_json(t), worm=worm, water=water, gravity=0x3d70, ai=ai, tasks=tasks, teams=teams,
                     flames=[], mines=[], handled=handled, out=ai_snapshot()))
cases['flee'] = flee

args.output.write_text(json.dumps(dict(
    executable_sha256=digest,
    method=__doc__.strip().split('\n\n')[1].replace('\n', ' '),
    counts={k: len(v) for k, v in cases.items()},
    cases=cases), separators=(',', ':')) + '\n')
print({k: len(v) for k, v in cases.items()})
