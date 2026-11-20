"""Execute the original CPU-team AI task control flow (vtable 00526958) frame by frame.

The task is built by the unchanged constructor 004CCFA0 and then driven as the
original coroutine: the body 004D0C60 runs unchanged from its entry; the yield
004F0D40 (vtable+0x28) is replaced by a stop that records the return point,
and every later frame continues emulation from there (the setjmp/longjmp
context switch of 004F0CD0/004F0D80 is modelled by this stop/continue). Inside
it the think step 004D0760, dispatcher 004D02C0, plan state 004CD460, execute
state 004CDC10, 004CD350, 004D0170, 004F0E40, 004CD380, 004EE960, 004EEC10,
the task lookup 004CCF50, the controller/root/worm queries 004E8510/004B7970/
004DF270, team-data getters and the event queue all execute unchanged.

Substituted (hooked) interfaces, all fed from data memory per case: hazard
004CEC90, flood fill 004CE690 (writes the reachable positions and path bytes),
flee search 004CE920, item distance 004EF0E0, teleport search 004F10A0, shot
search 004CE3A0 (writes the plan), walk routines 004CFF20/004CFD20, the
execution routines of states 0x67-0x6A and 0x6C-0x7A, 004B39A0 and 004EC310
inside the root query, worm vtable +0x08 (message 0x402) / +0x50 / +0x5C / +0x7C,
the registry iteration (scene+0x7D4 vtable +0x48/+0x4C), task send 004B26A0,
allocators, base task constructor 004ED970 and the hash insert 004CCE30.
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

OBJ, STACK, STOP, STUBS, DATA, HEAP, CTX = 0x2000000, 0x2100000, 0x2200000, 0x2300000, 0x2400000, 0x2500000, 0x3000000
for address, length in [(OBJ, 0x4000), (STACK, 0x20000), (STOP, 0x1000), (STUBS, 0x1000), (DATA, 0x10000),
                        (HEAP, 0x10000), (CTX, 0x30000)]:
    cpu.mem_map(address, length)
cpu.mem_write(STUBS, b'\xc3' * 0x1000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000
def sread(address): return signed(read(address))

TD = CTX + 0x1b94
def team_addr(team): return TD + team * 0x51c
def worm_addr(team, worm): return TD + team * 0x51c + worm * 0x9c

S = {name: STUBS + 0x10 * i for i, name in enumerate([
    'type', 'position', 'state', 'message', 'first', 'next', 'event', 'alloc', 'alloc2'])}
WORMVT, REG, REGVT, LIST, TEAMTASK, TEAMVT, ROOT, ROOTVT, PARENT, HASH, NODES, TASKS = (
    DATA + 0x100, DATA + 0x300, DATA + 0x380, DATA + 0x400, DATA + 0x600, DATA + 0x6c0, DATA + 0x800, DATA + 0x7c0,
    DATA + 0xa00, DATA + 0x3000, DATA + 0x3800, DATA + 0x6000)
write(WORMVT + 0x8, S['message']); write(WORMVT + 0xc, 0x4df270); write(WORMVT + 0x50, S['type'])
write(WORMVT + 0x5c, S['position']); write(WORMVT + 0x7c, S['state'])
write(REG, REGVT); write(REGVT + 0x48, S['first']); write(REGVT + 0x4c, S['next'])
write(TEAMTASK, TEAMVT); write(TEAMVT + 0xc, 0x4e8510)
write(ROOT, ROOTVT); write(ROOTVT + 0xc, 0x4b7970)

EXECUTE = {0x4f2fd0: 0x67, 0x4f3190: 0x68, 0x4f3250: 0x69, 0x4f3e50: 0x6a, 0x4f2780: 0x6c, 0x4f2830: 0x6d,
           0x4f2900: 0x6e, 0x4f1ac0: 0x6f, 0x4f1b10: 0x70, 0x4f1bb0: 0x71, 0x4f1270: 0x72, 0x4f12e0: 0x73,
           0x4f1350: 0x74, 0x4f0e80: 0x75, 0x4f0ea0: 0x76, 0x4f0f10: 0x77, 0x4f2220: 0x78, 0x4f2270: 0x79,
           0x4f2310: 0x7a}
FIELDS = dict(state=0xe0, nextState=0xe4, action=0xec, delay=0x2934, replanned=0x2948, retries=0x292c,
              fuse=0x2938, x=0x293c, y=0x2940, targetMode=0x2944)

env = {}
calls = []
events = []

def ret(nargs, result=0):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    cpu.reg_write(UC_X86_REG_EAX, result & 0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP, sp + 4 + 4 * nargs)
    cpu.reg_write(UC_X86_REG_EIP, read(sp))

def take(name, default):
    # Callee results are drawn when first needed (generators may look at the
    # current world and task) and stored in call order for the replay.
    if 'gen' in env:
        value = env['gen'][name]()
        env['queues'].setdefault(name, []).append(value)
        return value
    q = env['queues'].get(name, [])
    i = env['cursor'].get(name, 0)
    env['cursor'][name] = i + 1
    return q[i] if i < len(q) else default

def apply_effect(effect):
    for name, value in effect.items(): write(OBJ + FIELDS[name], value)

def hook(cpu, address, size, user):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    ecx = cpu.reg_read(UC_X86_REG_ECX)
    arg = lambda i: signed(read(sp + 4 + 4 * i))
    if address == S['type']: ret(0, read(ecx + 0x10))
    elif address == S['state']: ret(0, read(ecx + 0x1c))
    elif address == S['position']:
        write(arg(0) & 0xffffffff, read(ecx + 0x14)); write(arg(1) & 0xffffffff, read(ecx + 0x18)); ret(2, 1)
    elif address == S['message']:
        calls.append(['message', arg(1)]); ret(4, 1)
    elif address in (S['first'], S['next']):
        task_out, it = arg(0) & 0xffffffff, arg(1) & 0xffffffff
        index = 0 if address == S['first'] else read(it)
        if index < read(LIST):
            write(task_out, read(LIST + 4 + 4 * index)); write(it, index + 1); ret(2, 1)
        else: ret(2, 0)
    elif address == S['event']:
        event, length, buf = arg(3), arg(4), arg(5) & 0xffffffff
        events.append([event, [signed(read(buf + 4 * i)) for i in range(length // 4)]])
        ret(6, 1)
    elif address in (S['alloc'], S['alloc2']):
        n = arg(0) if address == S['alloc'] else arg(1)
        p = env['heap']; env['heap'] = (p + n + 15) & ~15
        cpu.mem_write(p, b'\0' * n)
        cpu.reg_write(UC_X86_REG_EAX, p); cpu.reg_write(UC_X86_REG_ESP, sp + 4); cpu.reg_write(UC_X86_REG_EIP, read(sp))
    else:
        raise RuntimeError(hex(address))
for address in S.values():
    cpu.hook_add(UC_HOOK_CODE, hook, begin=address, end=address)

def positions_count(): return sread(OBJ + 0x24f0)
def callee(cpu, address, size, user):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    ecx = cpu.reg_read(UC_X86_REG_ECX)
    arg = lambda i: signed(read(sp + 4 + 4 * i))
    if address == 0x4f0d40:  # coroutine yield: park here until the next frame
        env['resume'] = (read(sp), sp + 4); env['yielded'] = True
        cpu.emu_stop()
    elif address == 0x4b26a0: hook(cpu, S['event'], size, user)
    elif address == 0x492550: hook(cpu, S['alloc'], size, user)
    elif address == 0x4924d0: hook(cpu, S['alloc2'], size, user)
    elif address == 0x4ed970:  # base task constructor: scene and lookup table come from the parent
        parent = arg(0) & 0xffffffff
        write(ecx, 0x527478); write(ecx + 0x38, read(parent + 0x38)); write(ecx + 0x30, read(parent + 0x30))
        ret(1, ecx)
    elif address == 0x4cce30:
        env['registered'] = [arg(0), arg(1), int(arg(2) & 0xffffffff == OBJ)]; ret(3, 1)
    elif address == 0x4cec90:
        r = take('hazard', 0); calls.append(['hazard']); ret(0, r)
    elif address == 0x4ce690:
        x, y = arg(0), arg(1)
        r = take('floodFill', [0])
        calls.append(['floodFill', x, y])
        if r[0]:
            entries = r[1]
            for i, (px, py, path, step) in enumerate(entries):
                cpu.mem_write(OBJ + 0x20f0 + 8 * i, struct.pack('<hhi', px, py, path))
                cpu.mem_write(OBJ + 0xf4 + path, bytes([step]))
            write(OBJ + 0x24f0, len(entries))
        ret(2, r[0])
    elif address == 0x4ce920:
        q = take('flee', 0); count = arg(1)
        calls.append(['flee', arg(0) - OBJ, count, arg(2), arg(3), arg(4)])
        ret(5, q % (count + 1) - 1 if count >= 0 else -1)
    elif address == 0x4ef0e0:
        r = take('item', [0, 0]); calls.append(['item', arg(0), arg(1), arg(3)])
        if r[0]: write(arg(2) & 0xffffffff, r[1])
        ret(4, r[0])
    elif address == 0x4f10a0:
        r = take('teleport', [0, 0, 0]); calls.append(['teleportSearch'])
        if r[0]: write(arg(0) & 0xffffffff, r[1]); write(arg(1) & 0xffffffff, r[2])
        ret(2, r[0])
    elif address == 0x4ce3a0:
        plan = arg(0) & 0xffffffff
        calls.append(['shotSearch', plan - OBJ, sread(OBJ + 0x2954)])
        for k, v in take('shot', {}).items(): write(plan + 4 * int(k), v)
        ret(1, 0)
    elif address in (0x4cff20, 0x4cfd20):
        name = 'walkStep' if address == 0x4cff20 else 'walkPlan'
        r, effect = take(name, [0, {}]); calls.append([name]); apply_effect(effect); ret(0, r)
    elif address in EXECUTE:
        effect = take('execute', {}); calls.append(['execute', EXECUTE[address]]); apply_effect(effect); ret(0, 0)
    elif address == 0x4b39a0: ret(0, env['world']['ended'])
    elif address == 0x4ec310: ret(0, env['world']['panel'])
    elif address == 0x4ee960: calls.append(['logicRandom'])   # executes unchanged
    elif address == 0x4cd380: calls.append(['wormAbove'])     # executes unchanged
    elif address == 0x4eec10: calls.append(['settling'])      # executes unchanged
    else: raise RuntimeError(hex(address))
CALLEES = [0x4f0d40, 0x4b26a0, 0x492550, 0x4924d0, 0x4ed970, 0x4cce30, 0x4cec90, 0x4ce690, 0x4ce920, 0x4ef0e0,
           0x4f10a0, 0x4ce3a0, 0x4cff20, 0x4cfd20, 0x4b39a0, 0x4ec310, 0x4ee960, 0x4cd380, 0x4eec10, *EXECUTE]
for address in CALLEES: cpu.hook_add(UC_HOOK_CODE, callee, begin=address, end=address)
# Block coverage of the ported control flow (reported, not stored).
covered = set()
def block(cpu, address, size, user): covered.add(address)
from unicorn import UC_HOOK_BLOCK
cpu.hook_add(UC_HOOK_BLOCK, block, begin=0x4cd460, end=0x4ce020)
cpu.hook_add(UC_HOOK_BLOCK, block, begin=0x4d02c0, end=0x4d0cb0)

def run(address, stack_args=(), this=OBJ):
    sp = STACK + 0x1f000
    for i, value in enumerate([STOP, *stack_args]): write(sp + 4 * i, value)
    cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, this)
    cpu.emu_start(address, STOP, count=50000000)
    if cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError(f'{address:#x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

def bucket(kind, index): return abs(abs(index * 17 + kind) & 0xff)
def rebuild_hash(entries):
    cpu.mem_write(HASH, b'\0' * 0x404); cpu.mem_write(NODES, b'\0' * 0x800)
    for i, (kind, index, task) in enumerate(entries):
        node = NODES + 0x20 * i; b = HASH + 4 + 4 * bucket(kind, index)
        write(node + 4, read(b)); write(node + 8, kind); write(node + 0xc, index); write(node + 0x10, task)
        write(b, node)

BODY = [0x260, 0x25c, 0x298, 0x29c, 0x264, 0x26c, 0x150] + [0x110 + 4 * i for i in range(10)]
TEAM_FIELDS = dict(busy=0x48, active=0x40, menu=0x70, canAttack=0x84, selected=0x64, shotFired=0x50)
ROOT_FIELDS = dict(rTeam=0x128, rWorm=0x12c, r140=0x140, r14c=0x14c, r150=0x150, r154=0x154, r174=0x174,
                   r180=0x180, r188=0x188)
def apply_world(c, w):
    team = c['team']
    write(team_addr(team) - 4, w['cur'])
    write(worm_addr(team, w['cur']) - 0x504, w['tgtTeam']); write(worm_addr(team, w['cur']) - 0x500, w['tgtWorm'])
    for k, off in TEAM_FIELDS.items(): write(TEAMTASK + off, w[k])
    for k, off in ROOT_FIELDS.items(): write(ROOT + off, w[k])
    write(CTX + 0x800, w['settle'])
    entries = [(0x15, team, TEAMTASK), (0x14, 0, ROOT)]
    for i, r in enumerate(c['registry']):
        task = TASKS + i * 0x400
        if r.get('own'):
            write(task + 0x14, w['wx']); write(task + 0x18, w['wy']); write(task + 0x1c, w['status'])
            for off, v in zip(BODY, w['body']): write(task + off, v)
            if not (w['wormMissing'] and r['worm'] == w['cur']): entries.append((2, team * 16 + r['worm'], task))
    rebuild_hash(entries)

AI_WORDS = dict(team=0xd4, aggression=0xd8, skill=0xdc, state=0xe0, nextState=0xe4, action=0xec, retries=0x292c,
                field2930=0x2930, delay=0x2934, fuse=0x2938, x=0x293c, y=0x2940, targetMode=0x2944, replanned=0x2948,
                firstWorm=0x294c, plannedWorm=0x2950, seed=0x2954, targetTeam=0x28fc, targetWorm=0x2900,
                livingWorms=0x2db4, backflips=0x2db8, running=0x2dd0, walkPath=0x2910, walkStep=0x2914,
                walkX=0x2920, walkY=0x2924, walk2928=0x2928, walkRaw=0x2904, walkRaw2=0x2908)
def ai_state():
    s = {k: sread(OBJ + off) for k, off in AI_WORDS.items()}
    s['plan'] = [sread(OBJ + 0x2958 + 4 * i) for i in range(24)]
    s['teamSnapshot'] = [sread(OBJ + 0x29b8 + 4 * i) for i in range(6)]
    s['rootSnapshot'] = [sread(OBJ + 0x2b0c + 4 * i) for i in range(9)]
    s['wormSnapshot'] = [sread(OBJ + 0x2c60 + 4 * i) for i in range(20)]
    s['sceneThinking'] = sread(CTX + 0x1d428); s['logicSeed'] = sread(CTX + 0x1acc)
    return s

rng = random.Random(0x7a5c)
FX = 1 << 16
cases = {}

# 1. Constructor 004CCFA0.
ctors = []
for n in range(200):
    team = rng.randint(1, 6); count = rng.randint(0, 8)
    health = {w: rng.choice([0, 0, 1, 50, 100, -3]) for w in range(1, count + 1)}
    skill, aggression = rng.randint(-30, 140), rng.randint(-30, 140)
    seed = rng.getrandbits(32)
    cpu.mem_write(OBJ, b'\0' * 0x4000); cpu.mem_write(CTX, b'\0' * 0x30000)
    env.clear(); env.update(heap=HEAP, queues={}, cursor={})
    write(PARENT + 0x38, CTX); write(PARENT + 0x30, HASH); write(CTX + 0x1acc, seed)
    write(team_addr(team), count)
    for w, hp in health.items(): write(worm_addr(team, w) - 0x538, hp)
    r = run(0x4ccfa0, [PARENT, team, skill, aggression])
    s = ai_state()
    ctors.append(dict(team=team, wormCount=count, health=health, skill=skill, aggression=aggression, seed=signed(seed),
                      result=int(r == OBJ), registered=env['registered'], classId=sread(OBJ + 0x2c),
                      vtable=read(OBJ), coroutineStack=sread(OBJ + 0xd0), coroutineState=sread(OBJ + 0x40),
                      queue=int(read(OBJ + 0x2dc4) != 0), picker=int(read(OBJ + 0x2dcc) != 0), land=read(OBJ + 0x2dc8),
                      out={k: s[k] for k in ('team', 'aggression', 'skill', 'state', 'nextState', 'action', 'delay',
                                              'replanned', 'firstWorm', 'plannedWorm', 'seed', 'livingWorms',
                                              'backflips', 'retries', 'running', 'field2930')}))
cases['constructor'] = ctors

# 2. Multi-frame runs of the coroutine body.
def rand_effect(kind):
    e = {}
    if rng.random() < 0.55:
        e['state'] = rng.choice([0x64, 0x6b, 0x7b, 0x7d, 0x7e, 0x66, 0x67, 0x6c, 0x6f, 0x72, 0x75, 0x78, 0x6a, 0x65, 0x7c])
        e['delay'] = rng.choice([0, 0, 10]); e['replanned'] = 0
    if rng.random() < 0.3: e['nextState'] = rng.choice([0x64, 0x7b, 0x7d, 0x7e, 0x6f, 0x67, 0x69])
    if rng.random() < 0.7:
        e['action'] = rng.choice([1, -1, 2, -2, 3, -3, 100, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d,
                                  0x6e, 0x6f, 0x70, 0x71, 0])
    if rng.random() < 0.2: e['retries'] = rng.choice([0, 3, 6, 9])
    if rng.random() < 0.2:
        e['fuse'] = rng.randint(1, 5); e['x'] = rng.randint(-3000, 3000); e['y'] = rng.randint(-3000, 3000)
        e['targetMode'] = rng.randint(-2, 3)
    return e
STATES_AFTER = {0x67: [0x68], 0x68: [0x69], 0x69: [0x6a], 0x6a: [0x6b, 0x64], 0x6c: [0x6d], 0x6d: [0x6e], 0x6e: [0x6b, 0x6e],
                0x6f: [0x70], 0x70: [0x71], 0x71: [0x6b], 0x72: [0x73], 0x73: [0x74], 0x74: [0x6b], 0x75: [0x76],
                0x76: [0x77], 0x77: [0x6b], 0x78: [0x79], 0x79: [0x7a], 0x7a: [0x6b]}
def generators(c):
    g = {}
    g['hazard'] = lambda: int(rng.random() < 0.2)
    def fill():
        if rng.random() < 0.15: return [0]
        entries = []
        for _ in range(rng.randint(1, 6)):
            entries.append([rng.randint(-200, 2200), rng.randint(-100, 900), rng.randint(0, 0x1ff0),
                            0 if rng.random() < 0.4 else rng.randint(1, 255)])
        return [1, entries]
    g['floodFill'] = fill
    g['flee'] = lambda: rng.randint(0, 1000)
    g['item'] = lambda: [int(rng.random() < 0.97), rng.choice([rng.randint(0, 0x1c0000), 0x1c0000] + [rng.randint(0x1c0001, 0x900000)] * 18)]
    g['teleport'] = lambda: [int(rng.random() < 0.4), rng.randint(0, 1900) * FX + rng.randint(0, 0xffff),
                             rng.randint(0, 800) * FX + rng.randint(0, 0xffff)]
    def shot():
        if rng.random() < (0 if c['flavor'] == 'clock' else 0.4): return {}  # the original keeps the better existing plan
        cur = env['world']['cur']
        p = {0: cur if rng.random() < 0.85 else rng.choice(c['worms'] + [0]), 1: rng.choice([1, 6, 11, 16, 21, 27, 40]),
             3: rng.choice([0, rng.randint(1, 300)]), 4: rng.choice([0, 0, rng.randint(1, 50)]), 5: rng.getrandbits(31),
             6: rng.choice([0, 1, 2, 2, 3, 3, 4, 4, 5, 7, -1])}
        for k in (14, 15, 18, 23): p[k] = rng.randint(0, 7)
        if c['flavor'] == 'clock': p[6] = rng.randint(1, 5)
        return {str(k): v for k, v in p.items()}
    g['shot'] = shot
    def walk():
        e = rand_effect('walk') if rng.random() < 0.2 else {}
        if rng.random() < 0.25: e.update(state=sread(OBJ + 0xe4), delay=10, replanned=0)
        return [int(rng.random() < 0.5), e]
    g['walkStep'] = walk; g['walkPlan'] = walk
    def execute():
        e = rand_effect('exec') if rng.random() < 0.3 else {}
        state = sread(OBJ + 0xe0)
        if rng.random() < 0.5 and state in STATES_AFTER:
            e.update(state=rng.choice(STATES_AFTER[state]), delay=rng.choice([0, 10]), replanned=0)
            if e['state'] == 0x6b: e['nextState'] = rng.choice([0x64, 0x7e, 0x65, 0x69])
        return e
    g['execute'] = execute
    return g

def random_world(c):
    return dict(cur=rng.choice(c['worms']), wormMissing=0, status=0x65, busy=0, active=1, menu=0,
                canAttack=1, selected=rng.choice([0, 1, 6, 11]), shotFired=0, rTeam=c['team'], rWorm=1,
                r140=rng.randint(0, 5), r14c=0, r150=0, r154=0, r174=0, r180=rng.randint(0, 900000),
                r188=rng.choice([rng.randint(0, 20000), rng.randint(20000, 60000), rng.randint(20000, 60000)]), ended=0, panel=rng.randint(0, 6), wx=rng.randint(100, 1800) * FX,
                wy=rng.randint(100, 700) * FX, settle=0, tgtTeam=rng.randint(0, 6), tgtWorm=rng.randint(0, 8),
                body=[rng.randint(-0x20000, 0x20000) for _ in BODY])
def mutate(c, w, last_events):
    w = dict(w)
    if any(e[0] == 0x42b for e in last_events) and rng.random() < 0.85:
        i = c['worms'].index(w['cur']) if w['cur'] in c['worms'] else 0
        w['cur'] = c['worms'][(i + 1) % len(c['worms'])]
    if rng.random() < 0.003: w['cur'] = rng.choice(c['worms'])
    if rng.random() < c['endRate']: w['cur'] = 0
    w['wormMissing'] = int(rng.random() < c['endRate'])
    if rng.random() < 0.15: w['status'] = rng.choice([0x65] * 6 + [0x66, 0x67, 0x68, 0x80])
    if rng.random() < c['endRate']: w['status'] = 0x64
    w['busy'] = int(rng.random() < 0.05)
    if c['flavor']: return w  # boundary runs keep their flags and clock
    for k, p, choices in (('canAttack', 0.05, [0, 1, 1]), ('shotFired', 0.05, [0, 0, 1]), ('selected', 0.05, [0, 1, 6, 11]),
                          ('r150', 0.05, [0, 0, 1]), ('r154', 0.03, [0, 0, 1]), ('r174', 0.03, [0, 0, 1]),
                          ('r14c', 0.02, [0, 1]), ('rTeam', 0.02, [0, c['team'], 3]), ('rWorm', 0.05, c['worms']),
                          ('ended', 0.02, [0, 1]), ('settle', 0.08, [0, 0, 0, 7]), ('active', 0.02, [0, 1]),
                          ('menu', 0.02, [0, 1]), ('tgtTeam', 0.03, [0, 1, 2, 5]), ('tgtWorm', 0.03, [0, 1, 3])):
        if rng.random() < p: w[k] = rng.choice(choices)
    w['r188'] = max(0, w['r188'] - 20)
    if rng.random() < 0.01: w['r188'] = rng.choice([rng.randint(0, 19999), rng.randint(20000, 45000), 20000])
    if rng.random() < 0.02: w['r180'] = max(0, w['r180'] - rng.randint(0, 30000))
    if c['moving'] and rng.random() < 0.1: w['wx'] = (w['wx'] + rng.randint(-20, 20) * FX) | 0
    if c['moving'] and rng.random() < 0.1: w['wy'] = (w['wy'] + rng.randint(-20, 20) * FX) | 0
    if rng.random() < 0.05: w['body'] = [rng.randint(-0x20000, 0x20000) for _ in BODY]
    return w

def diff(old, new):
    # Arrays after the first frame are stored as {index: value} for the changed words.
    if isinstance(new, list) and isinstance(old, list):
        return {str(i): v for i, (a, v) in enumerate(zip(old, new)) if a != v}
    return new

runs = []
for n in range(440):
    # Runs 300+ target boundaries: worm on top + backflip cap, 20 s turn-time limit, water margin.
    flavor = None if n < 300 else ['above', 'clock', 'water'][n % 3]
    team = rng.randint(1, 6); nworms = 1 if flavor == 'above' else rng.choice([1, 1, 2, 3, 4])
    worms = list(range(1, nworms + 1))
    health = {wm: rng.choice([0, 100, 100, 37]) for wm in worms}
    if flavor: health = {wm: 100 for wm in worms}
    skill, aggression = rng.choice([0, 30, 49, 50, 80, 100, rng.randint(0, 100)]), rng.randint(0, 100)
    if flavor == 'clock': skill = rng.choice([49, 50, 51, 100])
    seed = rng.getrandbits(32)
    registry = []
    for wm in worms: registry.append(dict(own=True, worm=wm, type=2))
    home = [rng.randint(100, 1800) * FX + rng.randint(0, 0xffff), rng.randint(100, 700) * FX + rng.randint(0, 0xffff)]
    for _ in range(rng.randint(2, 5) if flavor == 'above' else rng.randint(0, 5)):
        if rng.random() < 0.5:  # around the AI worm's start: exercises 004CD380's window
            x = home[0] + rng.randint(-0xc0000, 0xc0000); y = home[1] + rng.randint(-0x130000, 0x30000)
        else: x, y = rng.randint(100, 1800) * FX, rng.randint(100, 700) * FX
        if flavor == 'above':
            x = home[0] + rng.choice([-0xa0000, -0xa0001, 0, 0xa0000, 0xa0001]); y = home[1] - rng.choice([0, 1, 0x110000, 0x110001, 0x50000])
        registry.append(dict(own=False, type=rng.choice([2, 2, 2, 10]), x=x, y=y))
    rng.shuffle(registry)
    c = dict(team=team, worms=worms, health=health, skill=skill, aggression=aggression, seed=signed(seed),
             registry=registry, frame=rng.randint(0, 100000), water=rng.choice([600, 650, 700, 2000]),
             rise=rng.choice([0, 5, 20, 255]), endRate=rng.choice([0.0, 0.0, 0.0, 0.0005, 0.002]), moving=rng.random() < 0.5 and not flavor, home=home, flavor=flavor)
    cpu.mem_write(OBJ, b'\0' * 0x4000); cpu.mem_write(CTX, b'\0' * 0x30000)
    cpu.mem_write(DATA + 0x6000, b'\0' * 0x4000)
    env.clear(); env.update(heap=HEAP, queues={}, cursor={}, gen=generators(dict(worms=worms, flavor=flavor)))
    c['queues'] = env['queues']
    write(PARENT + 0x38, CTX); write(PARENT + 0x30, HASH); write(CTX + 0x1acc, seed)
    write(CTX + 0x7f0, c['frame']); write(CTX + 0x804, c['water']); cpu.mem_write(CTX + 0x11d58, bytes([c['rise']]))
    write(CTX + 0x7d4, REG)
    write(team_addr(team), nworms)
    for wm, hp in health.items(): write(worm_addr(team, wm) - 0x538, hp)
    write(LIST, len(registry))
    for i, r in enumerate(registry):
        task = TASKS + i * 0x400
        write(task, WORMVT); write(task + 0x10, r['type'])
        if r['own']: write(task + 0xfc, team); write(task + 0x100, r['worm'])
        else: write(task + 0x14, r['x']); write(task + 0x18, r['y'])
        write(LIST + 4 + 4 * i, task)
    run(0x4ccfa0, [PARENT, team, skill, aggression])
    if rng.random() < 0.15: write(OBJ + 0x292c, rng.choice([0, 5, 6, 8]))  # walk failures left by 004CFD20/004CFF20
    c['retries'] = sread(OBJ + 0x292c)
    world = random_world(c); world['wx'], world['wy'] = home; last = []
    if flavor == 'clock': world['r188'] = rng.choice([19999, 20000, 20001, 20020])
    if flavor == 'water':
        world.update(r150=1, canAttack=1, shotFired=0)
        c['water'] = (home[1] >> 16) + rng.choice([0, 5, 20]) * 0 + rng.choice([-1, 0, 1])
        c['rise'] = rng.choice([0, 5, 20]); c['water'] += 5 * c['rise']
        write(CTX + 0x804, c['water']); cpu.mem_write(CTX + 0x11d58, bytes([c['rise']]))
    if flavor == 'above':
        preset = dict(state=0x7b, delay=0, replanned=1, firstWorm=1, plannedWorm=1, backflips=rng.choice([3, 4, 5]))
        for name, value in preset.items(): write(OBJ + AI_WORDS[name], value)
        c['preset'] = dict(fields=preset, plan=[0] * 24, positions=[])
    elif rng.random() < 0.4:
        # Start some runs inside a planning round (fields as 004CD460/004CDC10 leave them).
        preset = dict(state=rng.choice([0x7d, 0x7d, 0x7b]), delay=rng.choice([0, 3]), replanned=rng.choice([0, 1]),
                      firstWorm=rng.choice(worms), plannedWorm=rng.choice(worms + [0]),
                      backflips=rng.choice([0, 4, 5, 6]))
        plan = [rng.randint(-5, 300) for _ in range(24)]
        plan[0] = world['cur'] if rng.random() < 0.8 else rng.choice(worms); plan[5] = rng.getrandbits(31)
        plan[6] = rng.choice([0, 1, 2, 3, 4, 5, 6]); plan[3] = rng.choice([0, 50])
        for k in (14, 15, 18, 23): plan[k] = rng.randint(0, 5)
        entries = [[rng.randint(-200, 2200), rng.randint(-100, 900), rng.randint(0, 0x1ff0),
                    0 if rng.random() < 0.4 else rng.randint(1, 255)] for _ in range(rng.randint(1, 6))]
        for name, value in preset.items(): write(OBJ + AI_WORDS[name], value)
        for i, v in enumerate(plan): write(OBJ + 0x2958 + 4 * i, v)
        for i, (px, py, path, step) in enumerate(entries):
            cpu.mem_write(OBJ + 0x20f0 + 8 * i, struct.pack('<hhi', px, py, path)); cpu.mem_write(OBJ + 0xf4 + path, bytes([step]))
        write(OBJ + 0x24f0, len(entries))
        c['preset'] = dict(fields=preset, plan=plan, positions=entries)
    frames = []; started = False; status = 'running'; prev_world = {}
    for f in range(rng.choice([60, 100, 160, 240])):
        world = mutate(c, world, last) if f else world
        env['world'] = world
        apply_world(c, world)
        calls.clear(); events.clear(); env['yielded'] = False
        rec = dict(world={k: v for k, v in world.items() if prev_world.get(k) != v}); prev_world = world
        if status == 'finished':
            status = 'destroyed'
        elif status == 'running':
            if not started:
                sp = STACK + 0x1f000; write(sp, STOP)
                cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, OBJ)
                cpu.emu_start(0x4d0c60, STOP, count=50000000); started = True
            else:
                eip, esp = env['resume']
                cpu.reg_write(UC_X86_REG_ESP, esp)
                cpu.emu_start(eip, STOP, count=50000000)
            if not env['yielded']:
                if cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError('coroutine body stopped unexpectedly')
                status = 'finished'
        out = ai_state(); prev_out = frames[-1]['full'] if frames else {}
        rec.update(status=status, events=list(events), calls=list(calls),
                   out={k: diff(prev_out.get(k), v) for k, v in out.items() if prev_out.get(k) != v}, full=out)
        frames.append(rec); last = list(events)
        if status == 'destroyed': break
    for rec in frames: del rec['full']
    c['frames'] = frames
    runs.append(c)
cases['runs'] = runs

# Basic blocks of 004CD460..004CE020 and 004D02C0..004D0CB0 entered (reported only).
print('blocks', ' '.join(f'{a:x}' for a in sorted(covered)))
args.output.write_text(json.dumps(dict(
    executable_sha256=digest,
    method=__doc__.strip().split('\n\n')[1].replace('\n', ' '),
    counts={'constructor': len(ctors), 'runs': len(runs), 'frames': sum(len(r['frames']) for r in runs)},
    cases=cases), separators=(',', ':')) + '\n')
print({'constructor': len(ctors), 'runs': len(runs), 'frames': sum(len(r['frames']) for r in runs)})
