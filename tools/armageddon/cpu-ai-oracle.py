"""Execute the original CPU-team AI (task vtable 00526958, 0x2DD4 bytes) decision routines.

The AI object is a coroutine task (base 004F0B70, setjmp/longjmp stack 0x10000):
004D0C30 resumes it on every frame event 0x3EA, 004D0C60 loops 004D0760 and
yields once per think step. These captures run the routines below unchanged
inside an AI object whose scene, worm tasks, team task and landscape are
data-driven fakes:

  004CBC50/004CBCD0/004CBDB0  weighted weapon picker (object at AI+0x2DCC)
  004CFA90 + 004CF940/004F1CE0/004F2CC0/004F3890/004F16C0/004F23C0  plan ranking
  004CE7D0                    weapon evaluation dispatch + difficulty filter
  004CE270                    weapon-group trial (ammo, weights, AI LCG, ranking)
  004F3490 + 004F32D0         ballistic shot solver and terrain segment probe
  004CF130                    blast outcome estimate (enemy/friendly damage)
  004F2FD0/004F3190/004F3250  ballistic fire setup (skill jitter), aim/facing, charge
  004F2780/004F2830           gun aim jitter and aim steps
  004D0760                    action code -> controller event stream
  004F3F00 + 004F39A0         ballistic evaluator: candidate positions x flight times

Substituted (hooked) interfaces, all reading data memory: landscape pixel test
(AI+0x2DC8 vtable+0x54), task registry iteration (scene+0x7D4 vtable+0x48/+0x4C),
worm task type/snapshot/position/state (vtable+0x50/+0xC/+0x5C/+0x7C), team task
snapshot (AI+0x2DBC vtable+0xC), wind/gravity (scene+0x7D4 vtable+0x28/+0x24),
own-worm teleport/flags (vtable+0x100/+0x74/+0x78), coroutine yield 004F0D40,
task event send 004B26A0, allocators
00492550/004924D0, and for 004CE7D0/004CE270 the per-family evaluators
004F3F00/004F2D50/004F2470/004F1FC0/004F1A50 (004F3F00 runs unchanged in its own
section; the others are not ported); 004D0760 substitutes its think step 004D02C0.
Team-data getters, weapon table, trig, fixed math, the AI LCG and the message
queue execute unchanged.
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
for address, length in [(OBJ, 0x4000), (STACK, 0x10000), (STOP, 0x1000), (STUBS, 0x1000), (DATA, 0x10000),
                        (HEAP, 0x10000), (CTX, 0x30000)]:
    cpu.mem_map(address, length)
cpu.mem_write(STUBS, b'\xc3' * 0x1000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000
def sread(address): return signed(read(address))
def u16(v): return v & 0xffff

TD = CTX + 0x1b94  # team data (getters 004C2xxx/004C3xxx run unchanged)
WEAPONS = CTX + 0x125bc
def team_addr(team): return TD + team * 0x51c
def worm_addr(team, worm): return TD + team * 0x51c + worm * 0x9c

# Stubs (each a RET in the stub page, hooked below).
S = {name: STUBS + 0x10 * i for i, name in enumerate([
    'solid', 'type', 'wormMsg', 'position', 'state', 'first', 'next', 'teamMsg', 'event', 'alloc', 'alloc2',
    'think', 'ballistic', 'gun', 'melee', 'drop', 'strike', 'wind', 'gravity', 'flags', 'setFlags', 'teleport',
    'yield'])}
# Fake objects in DATA.
WORMVT, REG, REGVT, LIST, LAND, LANDVT, TEAMTASK, TEAMVT = (DATA + 0x100, DATA + 0x300, DATA + 0x380, DATA + 0x400,
                                                            DATA + 0x500, DATA + 0x580, DATA + 0x600, DATA + 0x680)
PLAN_A, PLAN_B, WLIST, PICK, PICKBUF, OUT = DATA + 0x1000, DATA + 0x1100, DATA + 0x1200, DATA + 0x1300, DATA + 0x1400, DATA + 0x1800
EVAL = DATA + 0x2000  # evaluator script: per weapon slot, [result, enemy, friendly, type, f1c..]
TASKS = DATA + 0x6000
QOBJ = DATA + 0x1900
write(WORMVT + 0x50, S['type']); write(WORMVT + 0xc, S['wormMsg']); write(WORMVT + 0x5c, S['position']); write(WORMVT + 0x7c, S['state'])
write(REG, REGVT); write(REGVT + 0x48, S['first']); write(REGVT + 0x4c, S['next'])
write(REGVT + 0x28, S['wind']); write(REGVT + 0x24, S['gravity'])
write(WORMVT + 0x74, S['flags']); write(WORMVT + 0x78, S['setFlags']); write(WORMVT + 0x100, S['teleport'])
write(LAND, LANDVT); write(LANDVT + 0x54, S['solid'])
write(TEAMTASK, TEAMVT); write(TEAMVT + 0xc, S['teamMsg'])

env = {}
calls = []

def ret(nargs, result=0):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    cpu.reg_write(UC_X86_REG_EAX, result & 0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP, sp + 4 + 4 * nargs)
    cpu.reg_write(UC_X86_REG_EIP, read(sp))

def fnv(h, v):
    for b in struct.pack('<i', v):
        h = ((h ^ b) * 0x01000193) & 0xffffffff
    return h

EVAL_WEAPONS = {S['ballistic']: 'ballistic', S['gun']: 'gun', S['melee']: 'melee', S['drop']: 'drop', S['strike']: 'strike'}
def hook(cpu, address, size, user):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    ecx = cpu.reg_read(UC_X86_REG_ECX)
    arg = lambda i: signed(read(sp + 4 + 4 * i))
    if address == S['solid']:
        x, y = arg(0), arg(1)
        hit = int(any(r[0] <= x <= r[2] and r[1] <= y <= r[3] for r in env.get('terrain', [])))
        env['probes'] += 1; env['probeHash'] = fnv(fnv(env['probeHash'], x), y)
        ret(2, hit)
    elif address == S['type']: ret(0, read(ecx + 0x10))
    elif address == S['state']: ret(0, read(ecx + 0x1c))
    elif address == S['position']:
        write(arg(0) & 0xffffffff, read(ecx + 0x14)); write(arg(1) & 0xffffffff, read(ecx + 0x18)); ret(2, 1)
    elif address == S['wormMsg']:
        msg, length, buf = arg(0), arg(1), arg(2) & 0xffffffff
        if msg == 0x7d3: cpu.mem_write(buf, bytes(cpu.mem_read(ecx + 0x40, length)))
        ret(3, read(ecx + 0x20) if msg == 0x7d3 else 0)
    elif address == S['teamMsg']:
        msg, length, buf = arg(0), arg(1), arg(2) & 0xffffffff
        cpu.mem_write(buf, bytes(cpu.mem_read(TEAMTASK + 0x40, length)))
        ret(3, 1)
    elif address in (S['first'], S['next']):
        task_out, it = arg(0) & 0xffffffff, arg(1) & 0xffffffff
        index = 0 if address == S['first'] else read(it)
        if index < read(LIST):
            write(task_out, read(LIST + 4 + 4 * index)); write(it, index + 1); ret(2, 1)
        else: ret(2, 0)
    elif address == S['event']:
        event, length, buf = arg(3), arg(4), arg(5) & 0xffffffff
        words = [signed(read(buf + 4 * i)) for i in range(length // 4)]
        calls.append(dict(operation='event', request=[arg(1), arg(2), event, length, words]))
        ret(6, 1)
    elif address in (S['alloc'], S['alloc2']):
        n = arg(0) if address == S['alloc'] else arg(1)
        p = env['heap']; env['heap'] = (p + n + 15) & ~15
        cpu.mem_write(p, b'\0' * n)
        sp_ret = read(sp); cpu.reg_write(UC_X86_REG_EAX, p); cpu.reg_write(UC_X86_REG_ESP, sp + 4); cpu.reg_write(UC_X86_REG_EIP, sp_ret)
    elif address == S['think']:
        write(OBJ + 0xec, read(DATA + 0x14)); ret(0, read(DATA + 0x10))
    elif address == S['wind']: ret(0, read(DATA + 0x20))
    elif address == S['gravity']: ret(0, read(DATA + 0x24))
    elif address == S['flags']:
        calls.append(dict(operation='flags', request=[], result=sread(ecx + 0x24))); ret(0, read(ecx + 0x24))
    elif address == S['setFlags']:
        calls.append(dict(operation='setFlags', request=[arg(0)])); write(ecx + 0x24, arg(0)); ret(1, 1)
    elif address == S['teleport']:
        x, y = arg(0), arg(1)
        ok = 0 if [x >> 16, y >> 16] in env.get('blocked', []) else 1
        if ok: write(ecx + 0x14, x); write(ecx + 0x18, y)
        calls.append(dict(operation='teleport', request=[x, y], result=ok)); ret(2, ok)
    elif address == S['yield']:
        calls.append(dict(operation='yield', request=[])); ret(0, 0)
    elif address in EVAL_WEAPONS:
        plan, weapon = arg(0) & 0xffffffff, arg(1)
        row = EVAL + weapon * 0x80
        result = sread(row)
        # Like 004F3490, a successful family writes every plan word except +0 (stamp)
        # and +0x14 (seed); a failed one clears +0x18.
        if result:
            for k in range(1, 24):
                if k != 5: write(plan + 4 * k, read(row + 4 * k))
            write(plan + 4, weapon)
        else:
            write(plan + 0x18, 0)
        calls.append(dict(operation='evaluate', request=[EVAL_WEAPONS[address], weapon], result=result))
        ret(2, result)
    else:
        raise RuntimeError(hex(address))
for address in S.values():
    cpu.hook_add(UC_HOOK_CODE, hook, begin=address, end=address)
# Redirect the true external calls to stubs by hooking their entry points.
REDIRECT = {0x4b26a0: S['event'], 0x492550: S['alloc'], 0x4924d0: S['alloc2'], 0x4d02c0: S['think'], 0x4f0d40: S['yield'],
            0x4f3f00: S['ballistic'], 0x4f2d50: S['gun'], 0x4f2470: S['melee'], 0x4f1fc0: S['drop'], 0x4f1a50: S['strike']}
def redirect(cpu, address, size, user):
    if address == 0x4f3f00 and env.get('realBallistic'): return
    hook(cpu, REDIRECT[address], size, user)
for address in REDIRECT: cpu.hook_add(UC_HOOK_CODE, redirect, begin=address, end=address)
def guard(cpu, address, size, user): raise RuntimeError(f'Unhooked call target {address:#x}')
for address in [0x4ccf50, 0x4ee960, 0x4c8920, 0x4ce690, 0x4cea30, 0x4d0170]:
    cpu.hook_add(UC_HOOK_CODE, guard, begin=address, end=address)

def run(address, stack_args=(), this=OBJ):
    sp = STACK + 0xf000
    for i, value in enumerate([STOP, *stack_args]): write(sp + 4 * i, value)
    cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, this)
    try: cpu.emu_start(address, STOP, count=200000000)
    except Exception as error: raise RuntimeError(f'{address:#x} faulted at {cpu.reg_read(UC_X86_REG_EIP):#x}') from error
    if cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError(f'{address:#x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

AI_FIELDS = dict(team=0xd4, aggression=0xd8, skill=0xdc, state=0xe0, nextState=0xe4, action=0xec,
                 targetTeam=0x28fc, targetWorm=0x2900, delay=0x2934, fuse=0x2938, x=0x293c, y=0x2940, targetMode=0x2944,
                 replanned=0x2948, seed=0x2954, weapon=0x295c, flightTicks=0x2980, aim=0x29a4, power=0x29a8,
                 facing=0x29b0, gunAim=0x2998, gunFacing=0x299c, teams=0x2db4, snapTeam=0x2c60, snapWorm=0x2c64)
def reset(ai=None, scene=None, worms=(), teams=None):
    """worms: list of dict(team, worm, x, y, type=2, own=False, state, snapshot words)."""
    global calls
    calls = []
    cpu.mem_write(OBJ, b'\0' * 0x4000); cpu.mem_write(CTX, b'\0' * 0x30000)
    cpu.mem_write(DATA + 0x1000, b'\0' * 0xf000)
    write(OBJ, 0x526958); write(OBJ + 0x38, CTX); write(OBJ + 0x2dc8, LAND); write(CTX + 0x7d4, REG)
    write(OBJ + 0x2dbc, TEAMTASK); write(OBJ + 0x2dcc, PICK)
    write(PICK, 0x526918); write(PICK + 8, 0x47); write(PICK + 0xc, PICKBUF)
    env.clear(); env.update(probes=0, probeHash=0x811c9dc5, heap=HEAP, terrain=[])
    for name, value in (ai or {}).items(): write(OBJ + AI_FIELDS[name], value)
    for offset, value in (scene or {}).items(): write(CTX + offset, value)
    for team, t in (teams or {}).items():
        write(team_addr(team) + 8, t.get('alliance', team))
        write(team_addr(team) - 0xc, t.get('flag', 0))
        write(team_addr(team) - 4, t.get('current', 1))
        for worm, hp in t.get('health', {}).items():
            write(worm_addr(team, worm) - 0x538, hp); write(worm_addr(team, worm) - 0x53c, t.get('alt', {}).get(worm, hp // 2))
        cpu.mem_write(CTX + 0x3cd4 + team * 3000, bytes([t.get('byte3cd4', 0) & 0xff]))
        cpu.mem_write(CTX + 0x4888 + team * 3000, bytes([t.get('byte4888', 0) & 0xff]))
    write(LIST, len(worms))
    own = 0
    for i, w in enumerate(worms):
        task = TASKS + i * 0x200
        cpu.mem_write(task, b'\0' * 0x200)
        write(task, WORMVT); write(task + 0x10, w.get('type', 2)); write(task + 0x14, w['x']); write(task + 0x18, w['y'])
        write(task + 0x1c, w.get('state', 0x65)); write(task + 0x20, w.get('msgResult', 1))
        write(task + 0x40, w.get('team', 0)); write(task + 0x44, w.get('worm', 0))
        for k, v in enumerate(w.get('snapshot', [])): write(task + 0x48 + 4 * k, v)
        write(LIST + 4 + 4 * i, task)
        if w.get('own'): own = task
    write(OBJ + 0x2dc0, own or TASKS)

def plan_words(address): return [sread(address + 4 * i) for i in range(24)]
def ai_snapshot(): return {name: sread(OBJ + off) for name, off in AI_FIELDS.items()}

rng = random.Random(0x5eed)
FX = 1 << 16
cases = {}

# 1. Weighted picker: add/pick/remove sequences on the 0x47-entry object.
picker = []
for n in range(240):
    reset(); ops = []
    for _ in range(rng.randint(1, 30)):
        kind = rng.choice(['add', 'add', 'pick', 'remove', 'clear'])
        if kind == 'add':
            w = rng.choice([rng.randint(1, 70), rng.randint(-3, 3)]); weight = rng.choice([0, -5, rng.randint(1, 50000)])
            r = run(0x4cbc50, [w, weight], PICK); ops.append(dict(op=kind, args=[w, weight], result=r))
        elif kind == 'pick':
            value = rng.getrandbits(32); r = run(0x4cbcd0, [value, OUT], PICK)
            ops.append(dict(op=kind, args=[value], result=r, out=sread(OUT) if r else None)); write(OUT, 0)
        elif kind == 'remove':
            w = rng.randint(-1, 70); r = run(0x4cbdb0, [w], PICK); ops.append(dict(op=kind, args=[w], result=r))
        else:
            run(0x4cbc30, [], PICK); ops.append(dict(op=kind, args=[], result=0))
        ops[-1]['entries'] = [[sread(PICKBUF + 8 * i), sread(PICKBUF + 8 * i + 4)] for i in range(sread(PICK + 4))]
    picker.append(ops)
cases['picker'] = picker

# Random plans for the ranking routine 004CFA90 (+0x18 type, +0xC enemy, +0x10 friendly, type fields).
def random_plan():
    p = [0] * 24
    p[6] = rng.choice([0, 1, 2, 3, 4, 5, 6, 3, 3])
    p[3] = rng.choice([0, rng.randint(1, 400), rng.randint(1, 4000)])
    p[4] = rng.choice([0, 0, rng.randint(1, 300)])
    for k in range(7, 24): p[k] = rng.randint(-1500, 1500) * FX + rng.randint(0, 0xffff) if rng.random() < 0.8 else rng.randint(-200, 200)
    # Types 1 and 4 divide by +0x1C (the original faults on zero), so keep it positive there.
    p[7] = rng.choice([rng.randint(1, 50) * FX, rng.randint(1, 900)]) if p[6] in (1, 4) else rng.choice([p[7], 0, -5])
    p[10] = rng.randint(0, 200)  # ticks for type 3 (+0x28)
    p[21] = rng.randint(0, 0x30000)  # error (+0x54)
    return p
def put_plan(address, p):
    for i, v in enumerate(p): write(address + 4 * i, v)

compare = []
for n in range(600):
    skill = rng.randint(0, 100)
    reset(dict(skill=skill)); a, b = random_plan(), random_plan()
    if rng.random() < 0.4:
        b[6] = a[6]
        if b[6] in (1, 4): b[7] = rng.randint(1, 50) * FX
    put_plan(PLAN_A, a); put_plan(PLAN_B, b)
    compare.append(dict(skill=skill, best=a, candidate=b, result=run(0x4cfa90, [PLAN_A, PLAN_B])))
cases['compare'] = compare

# 2. Difficulty filter in 004CE7D0 with substituted family evaluators.
FAMILY_WEAPONS = [1, 6, 7, 8, 0x2a, 0x2b, 0x2f, 0xb, 0xc, 0xd, 0xe, 0x10, 0x11, 0x12, 0x14, 0x23, 0x15, 0x16, 0x31,
                  0x1b, 0x1c, 0x1d, 0x2e, 0x32, 0x33, 0x36, 2, 3, 0x17, 0x3b, 0]
def script_evaluator(weapon, result=None):
    row = EVAL + weapon * 0x80
    plan = random_plan()
    res = result if result is not None else rng.choice([0, 1, 1, 1])
    plan[0] = res; plan[1] = weapon
    for k in range(24): write(row + 4 * k, plan[k])
    return dict(weapon=weapon, result=res, plan=plan)
filters = []
for n in range(400):
    ai = dict(skill=rng.randint(0, 100), aggression=rng.choice([0, rng.randint(0, 100), 100]), teams=rng.randint(0, 9))
    reset(ai); weapon = rng.choice(FAMILY_WEAPONS); ev = script_evaluator(weapon)
    put_plan(PLAN_A, [0x7777] * 24)
    r = run(0x4ce7d0, [PLAN_A, weapon])
    filters.append(dict(ai=ai, weapon=weapon, evaluator=ev, result=r, plan=plan_words(PLAN_A), calls=calls))
cases['filter'] = filters

# 3. Weapon-group trial 004CE270: ammo + table weights + AI LCG + ranking.
GROUPS = [[11], [6], [1], [16], [21, 22], [27], [13, 11, 12, 14, 16, 1, 6, 47, 7, 8, 43, 49, 21, 22, 54, 46, 27, 51, 50, 29, 28],
          [11, 1, 6, 7, 8, 21, 22, 27, 16]]
trials = []
for n in range(300):
    team = rng.randint(0, 5); alliance = rng.randint(0, 5)
    ai = dict(team=team, skill=rng.randint(0, 100), aggression=rng.randint(0, 100), teams=rng.randint(1, 6),
              seed=rng.getrandbits(32))
    reset(ai, teams={team: dict(alliance=alliance)})
    write(TD + 0x2c10, rng.choice([0, 0, 1]))
    group = rng.choice(GROUPS); ammo = {}; weights = {}; delayed = {}
    for w in group:
        ammo[w] = rng.choice([0, -1, 1, 2, 5, 30, rng.randint(-3, 40)])
        weights[w] = rng.choice([0, 1, 10, 100, rng.randint(1, 3000)])
        delayed[w] = rng.choice([0, 0, 0, 1])
        write(TD + (w + alliance * 0x8e) * 4 + 0x1eb8, ammo[w]); write(TD + (w + alliance * 0x8e) * 4 + 0x1fd4, delayed[w])
        write(WEAPONS + w * 0x208 + 0x200, weights[w])
    evaluators = [script_evaluator(w) for w in group]
    for i, w in enumerate(group + [0]): write(WLIST + 4 * i, w)
    best = random_plan() if rng.random() < 0.5 else [0] * 24
    if rng.random() < 0.3: best[6] = 0
    put_plan(PLAN_A, best)
    tries = rng.choice([0, 1, 2, 4, 4, 8]); stamp = rng.getrandbits(31); write(OBJ + 0x2b28, stamp)
    seed_arg = rng.getrandbits(32)
    run(0x4ce270, [PLAN_A, WLIST, tries, seed_arg])
    trials.append(dict(ai=ai, alliance=alliance, noDelayGate=sread(TD + 0x2c10), group=group, ammo=ammo, weights=weights,
                       delayed=delayed, evaluators=evaluators, best=best, tries=tries, stamp=stamp, seedArg=seed_arg,
                       plan=plan_words(PLAN_A), seed=read(OBJ + 0x2954), calls=calls,
                       picker=[[sread(PICKBUF + 8 * i), sread(PICKBUF + 8 * i + 4)] for i in range(sread(PICK + 4))]))
cases['trial'] = trials

# 4. Ballistic solver 004F3490 with real 004F32D0 probe and 004CF130 estimate.
def random_worms(own_team, own_worm, own_xy):
    worms = [dict(team=own_team, worm=own_worm, x=own_xy[0], y=own_xy[1], own=True)]
    for _ in range(rng.randint(0, 6)):
        worms.append(dict(team=rng.randint(0, 3), worm=rng.randint(1, 4), x=rng.randint(100, 1800) * FX + rng.randint(0, 0xffff),
                          y=rng.randint(100, 700) * FX + rng.randint(0, 0xffff), type=rng.choice([2, 2, 2, 10]),
                          msgResult=rng.choice([1, 1, 1, 0])))
    return worms
def random_teams():
    teams = {}
    for t in range(4):
        teams[t] = dict(alliance=rng.choice([t, 0, 1]), flag=rng.choice([0, 0, 0, 1]), byte3cd4=rng.choice([0, 0, 1]),
                        byte4888=rng.choice([0, 0, 0xff, 5]), health={w: rng.choice([0, 1, 9, 50, 100, 150, 400]) for w in range(1, 5)},
                        alt={w: rng.randint(0, 200) for w in range(1, 5)})
    return teams
def scene_values():
    return {0x804: rng.choice([600, 700, 2000]), 0x814: rng.choice([1, 1, 2, 3]), 0x1b8ac: rng.choice([0, 0, 1]),
            0x11d67: rng.choice([0, 0, 1])}
def put_scene_extra(scene, own_team, own_worm):
    cpu.mem_write(CTX + 0x11d67, bytes([scene[0x11d67]]))
    word = rng.choice([0, 0, 50, 300, 1200])
    cpu.mem_write(CTX + 0x4734 + (own_team * 0x4b + own_worm) * 0x28, struct.pack('<H', word))
    return word
def terrain():
    t = [[-3000, 720, 5000, 5000]]
    for _ in range(rng.randint(0, 6)):
        x, y = rng.randint(0, 1900), rng.randint(150, 700)
        t.append([x, y, x + rng.randint(2, 200), y + rng.randint(2, 120)])
    return t

ballistic = []
for n in range(500):
    own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
    x0 = rng.randint(50, 1850) * FX + rng.randint(0, 0xffff); y0 = rng.randint(100, 700) * FX + rng.randint(0, 0xffff)
    ai = dict(team=own_team, skill=rng.randint(0, 100), targetTeam=rng.randint(0, 3), targetWorm=rng.randint(1, 4),
              snapTeam=own_team, snapWorm=own_worm)
    worms = random_worms(own_team, own_worm, (x0, y0)); teams = random_teams(); scene = scene_values()
    reset(ai, scene, worms, teams); word = put_scene_extra(scene, own_team, own_worm)
    env['terrain'] = terrain()
    weapon = rng.choice([1, 6, 7, 8, 42, 43, 47]); launch = rng.choice([0, 1, 3, 7, 3])
    write(WEAPONS + weapon * 0x208 + 0x6c, launch)
    target = rng.choice(worms)
    tx = target['x'] + rng.randint(-20, 20) * FX if rng.random() < 0.7 else rng.randint(0, 1900) * FX
    ty = target['y'] + rng.randint(-20, 20) * FX if rng.random() < 0.7 else rng.randint(0, 720) * FX
    ax = rng.choice([0, rng.randint(-0x800, 0x800)]); ay = rng.choice([0x3d70, 0x3d70, 0x1eb8, 0, rng.randint(0, 0x8000)])
    ticks = rng.choice([rng.randint(1, 30), rng.randint(1, 150), -1, 5])  # zero faults (idiv)
    radius = rng.choice([16, 76, 116, 0]); damage = rng.choice([0, 30, 50, 75])
    allow = rng.choice([0, 1])
    put_plan(PLAN_A, [0x1234567] * 24)
    r = run(0x4f3490, [weapon, PLAN_A, x0, y0, tx, ty, ax, ay, ticks, radius, damage, allow])
    ballistic.append(dict(ai=ai, scene=scene, worms=worms, teams=teams, rangeWord=word, terrain=env['terrain'],
                          weapon=weapon, launch=launch, args=[x0, y0, tx, ty, ax, ay, ticks, radius, damage, allow],
                          result=r, plan=plan_words(PLAN_A), probes=env['probes'], probeHash=env['probeHash']))
cases['ballistic'] = ballistic

# 5. Blast estimate 004CF130 on its own (exclude-self flag 1 as well).
blasts = []
for n in range(400):
    own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
    own_xy = (rng.randint(50, 1850) * FX + rng.randint(0, 0xffff), rng.randint(100, 700) * FX)
    ai = dict(team=own_team, skill=rng.randint(0, 100), targetTeam=rng.randint(0, 3), targetWorm=rng.randint(1, 4),
              snapTeam=own_team, snapWorm=own_worm)
    worms = random_worms(own_team, own_worm, own_xy); teams = random_teams(); scene = scene_values()
    reset(ai, scene, worms, teams); word = put_scene_extra(scene, own_team, own_worm)
    target = rng.choice(worms)
    x = target['x'] + rng.randint(-60, 60) * FX + rng.randint(0, 0xffff); y = target['y'] + rng.randint(-60, 60) * FX
    radius = rng.choice([0, 16, 50, 76, 116, 200]); damage = rng.choice([0, 10, 30, 50, 75, 100]); exclude = rng.choice([0, 1])
    write(OUT, 0xdead); write(OUT + 4, 0xbeef)
    run(0x4cf130, [exclude, x, y, radius, damage, OUT, OUT + 4])
    blasts.append(dict(ai=ai, scene=scene, worms=worms, teams=teams, rangeWord=word, args=[exclude, x, y, radius, damage],
                       enemy=sread(OUT), friendly=sread(OUT + 4)))
cases['blast'] = blasts

# 6. Fire sequence steps.
def team_snapshot(words):
    for k, v in enumerate(words): write(TEAMTASK + 0x40 + 4 * k, v)
fire = []
for n in range(300):
    weapon = rng.choice([1, 6, 7, 8, 43]); selected = rng.choice([weapon, 0, 13])
    ai = dict(skill=rng.choice([0, 100, rng.randint(0, 100)]), seed=rng.getrandbits(32), weapon=weapon,
              aim=rng.choice([0, 0x8000, 0x10000, rng.randint(-0x2000, 0x12000)]),
              power=rng.choice([0x1999, 0x10000, rng.randint(0, 0x11000)]), flightTicks=rng.randint(0, 400),
              fuse=rng.randint(0, 5), state=0x67)
    reset(ai)
    entry = WEAPONS + weapon * 0x208
    kind = rng.choice([0, 1, 1, 1])
    fields = dict(kind=kind, fixed=rng.choice([0, 0, 1000]), secondary=rng.choice([0, 1]), secondaryFixed=rng.choice([0, 5]))
    write(entry + 0x68, kind); write(entry + 0x70, 3); write(entry + 0xc4, fields['fixed'])
    write(entry + 0x128, fields['secondary']); write(entry + 0x188, fields['secondaryFixed'])
    team_snapshot([0, 0, 0, 0, selected])
    run(0x4f2fd0)
    fire.append(dict(ai=ai, entry=fields, selected=selected, out=ai_snapshot()))
cases['fireSetup'] = fire

aim = []
for n in range(300):
    which = rng.choice(['aim', 'charge', 'gunSetup', 'gunAim'])
    ai = dict(aim=rng.choice([0x4000, 0x8000, rng.randint(0, 0x10000)]), power=rng.choice([0x369 * 20, 0x10000]),
              facing=rng.choice([0, 1, -1]), gunAim=rng.choice([0x4000, rng.randint(0, 0x10000)]), gunFacing=rng.choice([0, 1, -1]),
              weapon=rng.choice([11, 12, 13]), skill=rng.randint(0, 100), seed=rng.getrandbits(32), state=0x68, action=0x55)
    state = rng.choice([0x64, 0x65, 0x66, 0x67, 0x68, 0x6a])
    snap_aim = rng.choice([ai['aim'], ai['gunAim'], rng.randint(0, 0x10000)])
    phase = rng.choice([0x67, 0x68, 0x65, 0x69]); charge = rng.choice([ai['power'], 0x369 * 3, 0])
    worms = [dict(team=1, worm=2, x=500 * FX, y=400 * FX, own=True, state=state, snapshot=[phase, snap_aim, charge])]
    reset(ai, worms=worms)
    team_snapshot([0, 0, 0, 0, rng.choice([ai['weapon'], 1])])
    run({'aim': 0x4f3190, 'charge': 0x4f3250, 'gunSetup': 0x4f2780, 'gunAim': 0x4f2830}[which])
    aim.append(dict(step=which, ai=ai, wormState=state, snapshot=[phase, snap_aim, charge],
                    selected=sread(TEAMTASK + 0x50), out=ai_snapshot()))
cases['aimStep'] = aim

# 7. Action code -> event stream (004D0760, think step substituted).
actions = []
CODES = [0, 1, -1, 2, -2, 3, -3, 100, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x6d, 0x6e, 0x6f, 0x70, 0x71, 0x72, 4, -4, 0x75]
for code in CODES:
    for think in (1, 0, -1):
        for current in (2, 0):
            team = rng.randint(0, 5)
            ai = dict(team=team, fuse=rng.randint(1, 5), weapon=rng.randint(1, 70), x=rng.randint(-40000, 40000),
                      y=rng.randint(-40000, 40000), targetMode=rng.randint(-3, 3))
            reset(ai, teams={team: dict(current=current)})
            write(DATA + 0x10, think); write(DATA + 0x14, code)
            run(0x49c650, [0x100], QOBJ); write(OBJ + 0x2dc4, QOBJ)
            r = run(0x4d0760)
            actions.append(dict(code=code, think=think, current=current, ai=ai, result=r, action=sread(OBJ + 0xec), calls=calls))
cases['actions'] = actions

# 8. Ballistic evaluator 004F3F00 + candidate search 004F39A0 (real 004F3490/004CF130/004CFA90).
search = []
for n in range(120):
    own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
    x0 = rng.randint(200, 1700) * FX; y0 = rng.randint(300, 650) * FX
    ai = dict(team=own_team, skill=rng.randint(0, 100), targetTeam=rng.randint(0, 3), targetWorm=rng.randint(1, 4),
              snapTeam=own_team, snapWorm=own_worm, seed=rng.getrandbits(32))
    worms = random_worms(own_team, own_worm, (x0, y0)); teams = random_teams(); scene = scene_values()
    for w in worms[1:]:
        w['x'] = x0 + rng.randint(-500, 500) * FX; w['y'] = rng.randint(300, 700) * FX
    reset(ai, scene, worms, teams); word = put_scene_extra(scene, own_team, own_worm)
    env['terrain'] = terrain(); env['realBallistic'] = True
    own_task = read(OBJ + 0x2dc0); write(own_task + 0x24, rng.choice([0x10, 0x13]))
    count = rng.choice([0, 1, 3, 8, 15, 40, 90])
    positions = []
    for i in range(count):
        px = (x0 >> 16) + rng.randint(-150, 150); py = (y0 >> 16) + rng.randint(-40, 40)
        positions.append([px, py, rng.randint(0, 0x1ff0)])
        cpu.mem_write(OBJ + 0x20f0 + 8 * i, struct.pack('<hhi', px, py, positions[-1][2]))
    write(OBJ + 0x24f0, count)
    env['blocked'] = [p[:2] for p in positions if rng.random() < 0.15]
    weapon = rng.choice([1, 6, 7, 8, 42, 43, 47]); rec = WEAPONS + weapon * 0x208
    record = dict(launch=rng.choice([0, 3, 7]), kind=rng.choice([0, 1, 1]), fuseMs=rng.choice([0, 0, 3000, 1000]),
                  impact=rng.choice([0, 2]), mode=rng.choice([0, 0, 1, 2]), blast=rng.choice([20, 50, 75]),
                  extra=rng.choice([0, 3]), extraCount=rng.choice([0, 5]), wind=rng.choice([0, 50, 100]),
                  gravity=rng.choice([100, 100, 50]), acceptMiss=rng.choice([0, 0, 1]), secondaryFixed=rng.choice([0, 5]))
    for off, key in ((0x6c, 'launch'), (0x68, 'kind'), (0xc4, 'fuseMs'), (0x80, 'impact'), (0x128, 'mode'), (0x8c, 'blast'),
                     (0x150, 'extra'), (0x130, 'extraCount'), (0xb4, 'wind'), (0xbc, 'gravity'), (0x204, 'acceptMiss'),
                     (0x188, 'secondaryFixed')):
        write(rec + off, record[key])
    if not record['fuseMs'] and not record['impact']: record['impact'] = 2  # a zero fixed fuse faults (T=0)
    write(rec + 0x80, record['impact']); write(rec + 0x70, 3)
    ammo = rng.choice([0, 1, -1, 1, 1])
    write(teams_alliance := TD + (weapon + teams[own_team]['alliance'] * 0x8e) * 4 + 0x1eb8, ammo)
    write(DATA + 0x20, rng.choice([0, rng.randint(-0x2000, 0x2000)])); write(DATA + 0x24, rng.choice([0x3d70, 0x3d70, 0x2000]))
    put_plan(PLAN_A, [0x2468ace] * 24)
    r = run(0x4f3f00, [PLAN_A, weapon])
    search.append(dict(ai=ai, scene=scene, worms=worms, teams=teams, rangeWord=word, terrain=env['terrain'],
                       ownFlags=sread(own_task + 0x24), positions=positions, blocked=env['blocked'], weapon=weapon,
                       record=record, ammo=ammo, wind=sread(DATA + 0x20), gravity=sread(DATA + 0x24), result=r,
                       plan=plan_words(PLAN_A), seed=read(OBJ + 0x2954), probes=env['probes'], probeHash=env['probeHash'],
                       calls=calls))
cases['search'] = search

args.output.write_text(json.dumps(dict(
    executable_sha256=digest,
    method=__doc__.strip().split('\n\n')[1].replace('\n', ' '),
    counts={k: len(v) for k, v in cases.items()},
    cases=cases), separators=(',', ':')) + '\n')
print({k: len(v) for k, v in cases.items()})
