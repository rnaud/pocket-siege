"""Execute the original CPU-team AI (task vtable 00526958) weapon-family evaluators and their states.

These captures run the routines below unchanged inside an AI object whose
scene, worm tasks, team task and landscape are data-driven fakes (harness
copied from cpu-ai-oracle.py):

  004F2D50 + 004F29D0         gun evaluator (shotgun, handgun, uzi, minigun) + ray shot
  004F2900                    gun state 0x6E (after the shot: replan or escape walk)
  004F2470 + 004F23D0 + 004CF4B0  melee evaluator (fire punch only) + punch box estimate
  004F2220/004F2270/004F2310  melee states 0x78..0x7A (family 5)
  004F1FC0 + 004F1D50 + 004F1BF0  drop evaluator (dynamite, mine, Ming vase) + escape choice
  004F1AC0/004F1B10/004F1BB0  drop states 0x6F..0x71 (family 1)
  004F1A50 + 004F1730 + 004F1400  strike evaluator (both directions) + drop-line shot
  004F1270/004F12E0/004F1350  strike states 0x72..0x74 (family 4, targeting event 0x41A)
  004F10A0 + 004F0F60         teleport destination search + ground settle
  004F0E40/004F0E80/004F0EA0/004F0F10  teleport setup + states 0x75..0x77
  004CE920 + 004CEA30         escape position choice and its danger score
  004CEFD0 + 004CEEC0 + 004CED90  walk-to-water escape measure (crawl simulation)
  004CE730                    escape table refresh (pathfinder 004C8920 substituted)
  004D0170                    walk to a reachable position, then enter a state
  004CDC10 (plan start part)  family -> first execution state
  004CE3A0                    weapon-group search order (004CE270/004CE7D0 run unchanged)

Substituted (hooked) interfaces, all reading data memory: landscape pixel tests
(AI+0x2DC8 vtable+0x54 and scene+0x24 vtable+0x28), task registry iteration
(scene+0x7D4 vtable+0x48/+0x4C), worm task type/message/position/state
(vtable+0x50/+0xC/+0x5C/+0x7C), team task message (AI+0x2DBC vtable+0xC),
wind/gravity (scene+0x7D4 vtable+0x28/+0x24), object collision query
(scene+0x7D4 vtable+0x8), collision registration (scene+0x7D4 vtable+0x30),
own-worm teleport/flags (vtable+0x100/+0x74/+0x78), coroutine yield 004F0D40,
the reachability pathfinder 004C8920, and for 004CE3A0 the per-family evaluators.
Team-data getters, weapon table, trig, fixed math, the AI LCG and the shared
logic random 004EE960 execute unchanged.
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
parser.add_argument('--only', default='')
parser.add_argument('--scale', type=float, default=1.0)
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
GLOBAL_LIST = 0x56f710
pristine_list = bytes(cpu.mem_read(GLOBAL_LIST, 8))

OBJ, STACK, STOP, STUBS, DATA, HEAP, CTX = 0x2000000, 0x2100000, 0x2200000, 0x2300000, 0x2400000, 0x2500000, 0x3000000
for address, length in [(OBJ, 0x4000), (STACK, 0x10000), (STOP, 0x1000), (STUBS, 0x1000), (DATA, 0x10000),
                        (HEAP, 0x10000), (CTX, 0x30000)]:
    cpu.mem_map(address, length)
cpu.mem_write(STUBS, b'\xc3' * 0x1000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000
def sread(address): return signed(read(address))

TD = CTX + 0x1b94
WEAPONS = CTX + 0x125bc
def team_addr(team): return TD + team * 0x51c
def worm_addr(team, worm): return TD + team * 0x51c + worm * 0x9c

S = {name: STUBS + 0x10 * i for i, name in enumerate([
    'solid', 'type', 'wormMsg', 'position', 'state', 'first', 'next', 'teamMsg', 'event', 'alloc', 'alloc2',
    'think', 'ballistic', 'gun', 'melee', 'drop', 'strike', 'wind', 'gravity', 'flags', 'setFlags', 'teleport',
    'yield', 'blocked', 'collide', 'toggle', 'path'])}
WORMVT, REG, REGVT, LIST, LAND, LANDVT, TEAMTASK, TEAMVT = (DATA + 0x100, DATA + 0x300, DATA + 0x380, DATA + 0x400,
                                                            DATA + 0x500, DATA + 0x580, DATA + 0x600, DATA + 0x680)
LAND2, LAND2VT = DATA + 0x700, DATA + 0x780
PLAN_A, PLAN_B, WLIST, PICK, PICKBUF, OUT = DATA + 0x1000, DATA + 0x1100, DATA + 0x1200, DATA + 0x1300, DATA + 0x1400, DATA + 0x1800
EVAL = DATA + 0x2000
TASKS = DATA + 0x6000
AIVT = DATA + 0x5000
write(WORMVT + 0x50, S['type']); write(WORMVT + 0xc, S['wormMsg']); write(WORMVT + 0x5c, S['position']); write(WORMVT + 0x7c, S['state'])
write(REG, REGVT); write(REGVT + 0x48, S['first']); write(REGVT + 0x4c, S['next'])
write(REGVT + 0x28, S['wind']); write(REGVT + 0x24, S['gravity']); write(REGVT + 0x8, S['collide']); write(REGVT + 0x30, S['toggle'])
write(WORMVT + 0x74, S['flags']); write(WORMVT + 0x78, S['setFlags']); write(WORMVT + 0x100, S['teleport'])
write(LAND, LANDVT); write(LANDVT + 0x54, S['solid'])
write(LAND2, LAND2VT); write(LAND2VT + 0x28, S['blocked'])
write(TEAMTASK, TEAMVT); write(TEAMVT + 0xc, S['teamMsg'])
# The AI's own vtable: copy 00526958 so +0x28 (coroutine yield 004F0D40) stays the original.
cpu.mem_write(AIVT, bytes(cpu.mem_read(0x526958, 0x100)))

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
def inside(rects, x, y): return int(any(r[0] <= x <= r[2] and r[1] <= y <= r[3] for r in rects))

EVAL_WEAPONS = {S['ballistic']: 'ballistic', S['gun']: 'gun', S['melee']: 'melee', S['drop']: 'drop', S['strike']: 'strike'}
def hook(cpu, address, size, user):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    ecx = cpu.reg_read(UC_X86_REG_ECX)
    arg = lambda i: signed(read(sp + 4 + 4 * i))
    if address == S['solid']:
        x, y = arg(0), arg(1)
        env['probes'] += 1; env['probeHash'] = fnv(fnv(env['probeHash'], x), y)
        ret(2, inside(env['terrain'], x, y))
    elif address == S['blocked']:
        x, y = arg(0), arg(1)
        env['blocks'] += 1; env['blockHash'] = fnv(fnv(env['blockHash'], x), y)
        ret(2, inside(env['terrain'], x, y))
    elif address == S['collide']:
        mask, x, y, flags = arg(0), arg(1), arg(2), arg(3)
        env['collides'] += 1; env['collideHash'] = fnv(fnv(fnv(fnv(env['collideHash'], mask), x), y), flags)
        ret(4, inside(env['terrain'], x >> 16, y >> 16))
    elif address == S['toggle']:
        calls.append(dict(operation='toggle', request=[arg(i) if i not in (0, 3) else int(arg(i) != 0) for i in range(6)]))
        ret(6, 0)
    elif address == S['path']:
        x, y, table, limit = arg(0), arg(1), arg(6) & 0xffffffff, arg(7)
        rows = env.get('escapes', [])[:limit]
        for i, (ex, ey, path) in enumerate(rows): cpu.mem_write(table + 8 * i, struct.pack('<hhi', ex, ey, path))
        calls.append(dict(operation='path', request=[x, y], result=len(rows)))
        ret(10, len(rows))
    elif address == S['type']: ret(0, read(ecx + 0x10))
    elif address == S['state']: ret(0, read(ecx + 0x1c))
    elif address == S['position']:
        write(arg(0) & 0xffffffff, read(ecx + 0x14)); write(arg(1) & 0xffffffff, read(ecx + 0x18)); ret(2, 1)
    elif address == S['wormMsg']:
        msg, length, buf = arg(0), arg(1), arg(2) & 0xffffffff
        if msg == 0x7d3:
            cpu.mem_write(buf, bytes(cpu.mem_read(ecx + 0x40, length))); ret(3, read(ecx + 0x20))
        elif msg == 0x7d5: ret(3, read(ecx + 0x28))
        elif msg == 0x7d6: ret(3, read(ecx + 0x2c))
        else: ret(3, 0)
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
REDIRECT = {0x4b26a0: S['event'], 0x492550: S['alloc'], 0x4924d0: S['alloc2'], 0x4f0d40: S['yield'], 0x4c8920: S['path'],
            0x4f3f00: S['ballistic'], 0x4f2d50: S['gun'], 0x4f2470: S['melee'], 0x4f1fc0: S['drop'], 0x4f1a50: S['strike']}
def redirect(cpu, address, size, user):
    if address in env.get('real', ()): return
    hook(cpu, REDIRECT[address], size, user)
for address in REDIRECT: cpu.hook_add(UC_HOOK_CODE, redirect, begin=address, end=address)
def guard(cpu, address, size, user): raise RuntimeError(f'Unhooked call target {address:#x}')
for address in [0x4ccf50, 0x4d0760, 0x4d02c0]:
    cpu.hook_add(UC_HOOK_CODE, guard, begin=address, end=address)

def run(address, stack_args=(), this=OBJ):
    sp = STACK + 0xf000
    for i, value in enumerate([STOP, *stack_args]): write(sp + 4 * i, value)
    cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, this)
    try: cpu.emu_start(address, STOP, count=400000000)
    except Exception as error: raise RuntimeError(f'{address:#x} faulted at {cpu.reg_read(UC_X86_REG_EIP):#x}') from error
    if cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError(f'{address:#x} did not return')
    return signed(cpu.reg_read(UC_X86_REG_EAX))

AI_FIELDS = dict(team=0xd4, aggression=0xd8, skill=0xdc, state=0xe0, nextState=0xe4, action=0xec,
                 targetTeam=0x28fc, targetWorm=0x2900, delay=0x2934, fuse=0x2938, x=0x293c, y=0x2940, targetMode=0x2944,
                 replanned=0x2948, seed=0x2954, stamp=0x2958, weapon=0x295c, teams=0x2db4, snapTeam=0x2c60, snapWorm=0x2c64,
                 field2930=0x2930, planned=0x2950, walkX=0x2904, walkY=0x2908, walkPath=0x290c, walkY2=0x2910,
                 walkF=0x2914, walkPX=0x2920, walkPY=0x2924, walkG=0x2928, escapeCount=0x28f8, positionCount=0x24f0,
                 canAttack=0x29c4, selected=0x29c8, forced=0x29cc, wormWeapon=0x2c9c, airStrike=0x2b18, teamStamp=0x2b28)
def reset(ai=None, scene=None, worms=(), teams=None):
    global calls
    calls = []
    cpu.mem_write(OBJ, b'\0' * 0x4000); cpu.mem_write(CTX, b'\0' * 0x30000)
    cpu.mem_write(DATA + 0x1000, b'\0' * 0xf000)
    cpu.mem_write(AIVT, bytes(cpu.mem_read(0x526958, 0x100)))
    cpu.mem_write(GLOBAL_LIST, pristine_list)
    write(OBJ, AIVT); write(OBJ + 0x38, CTX); write(OBJ + 0x2dc8, LAND); write(CTX + 0x7d4, REG)
    write(CTX + 0x24, LAND2); write(CTX + 0x2f4, LAND)
    write(OBJ + 0x2dbc, TEAMTASK); write(OBJ + 0x2dcc, PICK)
    write(PICK, 0x526918); write(PICK + 8, 0x47); write(PICK + 0xc, PICKBUF)
    env.clear(); env.update(probes=0, probeHash=0x811c9dc5, blocks=0, blockHash=0x811c9dc5, collides=0,
                            collideHash=0x811c9dc5, heap=HEAP, terrain=[])
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
        write(task + 0x24, w.get('flags', 0)); write(task + 0x28, w.get('msg5', 0)); write(task + 0x2c, w.get('msg6', 0))
        write(task + 0x40, w.get('team', 0)); write(task + 0x44, w.get('worm', 0))
        for k, v in enumerate(w.get('snapshot', [])): write(task + 0x48 + 4 * k, v)
        write(LIST + 4 + 4 * i, task)
        if w.get('own'): own = task
    write(OBJ + 0x2dc0, own or TASKS)
    return own or TASKS

def plan_words(address): return [sread(address + 4 * i) for i in range(24)]
def ai_snapshot(): return {name: sread(OBJ + off) for name, off in AI_FIELDS.items()}
def put_plan(address, p):
    for i, v in enumerate(p): write(address + 4 * i, v)
def own_xy():
    task = read(OBJ + 0x2dc0); return [sread(task + 0x14), sread(task + 0x18)]

rng = random.Random(0x5eed + 7)
FX = 1 << 16
cases = {}
def count(n): return max(1, int(n * args.scale))
def wanted(name): return not args.only or name in args.only.split(',')

def random_teams():
    teams = {}
    for t in range(4):
        teams[t] = dict(alliance=rng.choice([t, 0, 1]), flag=rng.choice([0, 0, 0, 1]), byte3cd4=rng.choice([0, 0, 1]),
                        byte4888=rng.choice([0, 0, 0xff, 5]), health={w: rng.choice([0, 1, 9, 50, 100, 150, 400]) for w in range(1, 5)},
                        alt={w: rng.randint(0, 200) for w in range(1, 5)})
    return teams
def scene_values(water=None):
    return {0x804: water if water is not None else rng.choice([600, 700, 740, 2000]), 0x814: rng.choice([1, 1, 2, 3]),
            0x1b8ac: rng.choice([0, 0, 1]), 0x7f0: rng.randint(0, 5000), 0x1acc: rng.getrandbits(32)}
def put_range_word(own_team, own_worm):
    word = rng.choice([0, 0, 50, 300, 1200])
    cpu.mem_write(CTX + 0x4734 + (own_team * 0x4b + own_worm) * 0x28, struct.pack('<H', word))
    return word
def terrain(walls=True):
    t = [[rng.choice([-3000, rng.randint(0, 800)]), 720, rng.choice([5000, rng.randint(1100, 1900)]), 5000]]
    for _ in range(rng.randint(0, 6)):
        x, y = rng.randint(0, 1900), rng.randint(150, 700)
        t.append([x, y, x + rng.randint(2, 200), y + rng.randint(2, 120)])
    if walls:
        for _ in range(rng.randint(0, 3)):
            x = rng.randint(0, 1900); t.append([x, rng.randint(400, 700), x + rng.randint(2, 10), 720])
    return t
def near_worms(own_team, own_worm, own_xy, spread=200, count_range=(0, 6), types=(2, 2, 2, 10)):
    worms = [dict(team=own_team, worm=own_worm, x=own_xy[0], y=own_xy[1], own=True, flags=rng.choice([0x10, 0x13]))]
    for _ in range(rng.randint(*count_range)):
        worms.append(dict(team=rng.randint(0, 3), worm=rng.randint(1, 4),
                          x=own_xy[0] + rng.randint(-spread, spread) * FX + rng.randint(0, 0xffff),
                          y=rng.randint(560, 715) * FX + rng.randint(0, 0xffff), type=rng.choice(types),
                          msgResult=rng.choice([1, 1, 1, 0]), msg5=rng.choice([0, 0, 1]), msg6=rng.choice([0, 1])))
    return worms
def put_positions(origin, n, table=0x20f0, count_at=0x24f0, dx=80, dy=20):
    rows = []
    for i in range(n):
        px = (origin[0] >> 16) + rng.randint(-dx, dx); py = (origin[1] >> 16) + rng.randint(-dy, dy)
        rows.append([px, py, rng.randint(0, 0x1ff0)])
        cpu.mem_write(OBJ + table + 8 * i, struct.pack('<hhi', px, py, rows[-1][2]))
    write(OBJ + count_at, n)
    return rows
def put_route_bytes():
    """AI+0xF0 pathfinder map (0x2000 bytes); 004D0170 tests byte AI+0xF4+path."""
    raw = bytes(rng.choice([0, 0, 1, 7]) for _ in range(0x2000))
    cpu.mem_write(OBJ + 0xf0, raw)
    return raw
def put_record(weapon, fields):
    rec = WEAPONS + weapon * 0x208
    for off, value in fields.items(): write(rec + off, value)
    return rec
def put_ammo(weapon, alliance, ammo): write(TD + (weapon + alliance * 0x8e) * 4 + 0x1eb8, ammo)
def snapshot_state(): return dict(probes=env['probes'], probeHash=env['probeHash'], blocks=env['blocks'],
                                  blockHash=env['blockHash'], collides=env['collides'], collideHash=env['collideHash'])
def common_world(own_team, own_worm, x0, y0, water=None, spread=200, count_range=(0, 6), types=(2, 2, 2, 10)):
    ai = dict(team=own_team, skill=rng.randint(0, 100), targetTeam=rng.randint(0, 3), targetWorm=rng.randint(1, 4),
              snapTeam=own_team, snapWorm=own_worm, seed=rng.getrandbits(32))
    worms = near_worms(own_team, own_worm, (x0, y0), spread, count_range, types)
    teams = random_teams(); scene = scene_values(water)
    own = reset(ai, scene, worms, teams); word = put_range_word(own_team, own_worm)
    return ai, worms, teams, scene, word, own
def world_record(ai, worms, teams, scene, word):
    return dict(ai=ai, worms=worms, teams=teams, scene=scene, rangeWord=word, terrain=env['terrain'])

# ---------------------------------------------------------------- water escape 004CEFD0
if wanted('waterEscape'):
    out = []
    for n in range(count(160)):
        reset(scene={0x804: rng.choice([700, 740, 900, 900])})
        env['terrain'] = terrain()
        ground = env['terrain'][0]
        x = rng.choice([rng.randint(0, 1900), ground[0] + rng.randint(-20, 300), ground[2] + rng.randint(-300, 20)])
        y, direction = rng.randint(300, 730), rng.choice([-1, 1])
        r = run(0x4cefd0, [x, y, direction])
        out.append(dict(water=sread(CTX + 0x804), terrain=env['terrain'], args=[x, y, direction], result=r, **snapshot_state()))
    cases['waterEscape'] = out

# ---------------------------------------------------------------- escape choice 004CE920 + 004CEA30
if wanted('escape'):
    out = []
    for n in range(count(120)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(200, 1700) * FX + rng.randint(0, 0xffff); y0 = rng.randint(500, 700) * FX
        ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, spread=300,
                                                          types=(2, 2, 10, 15, 17, 3))
        env['terrain'] = terrain()
        rows = put_positions((x0, y0), rng.choice([0, 1, 3, 6, 12]), 0x24f4, 0x28f8, dx=120, dy=30)
        tx = x0 + rng.randint(-100, 100) * FX; ty = y0 + rng.randint(-30, 30) * FX; mode = rng.randint(0, 3)
        r = run(0x4ce920, [OBJ + 0x24f4, len(rows), tx, ty, mode])
        out.append(dict(**world_record(ai, worms, teams, scene, word), escapes=rows, args=[tx, ty, mode], result=r,
                        **snapshot_state()))
    cases['escape'] = out

# ---------------------------------------------------------------- gun shot 004F29D0
GUNS = [0xb, 0xc, 0xd, 0xe]
if wanted('gunShot'):
    out = []
    for n in range(count(400)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(50, 1850) * FX + rng.randint(0, 0xffff); y0 = rng.randint(300, 700) * FX + rng.randint(0, 0xffff)
        ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, spread=400)
        env['terrain'] = terrain()
        weapon = rng.choice(GUNS); rng_range = rng.choice([0, 1, 50, 300, 1000])
        put_record(weapon, {0xa0: rng_range})
        target = rng.choice(worms)
        tx = target['x'] + rng.randint(-10, 10) * FX if rng.random() < 0.8 else rng.randint(0, 1900) * FX
        ty = target['y'] + 4 * FX
        radius, damage = rng.choice([8, 10, 18, 0]), rng.choice([0, 15, 25, 40])
        put_plan(PLAN_A, [0x1234567] * 24)
        r = run(0x4f29d0, [weapon, PLAN_A, x0, y0, tx, ty, radius, damage])
        out.append(dict(**world_record(ai, worms, teams, scene, word), weapon=weapon, range=rng_range,
                        args=[x0, y0, tx, ty, radius, damage], result=r, plan=plan_words(PLAN_A), **snapshot_state()))
    cases['gunShot'] = out

def search_setup(n_choices, spread, weapon_choices, alliance_ammo=True, water=None, dx=150, dy=40, types=(2, 2, 2, 10)):
    own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
    x0 = rng.randint(200, 1700) * FX; y0 = rng.randint(400, 680) * FX
    ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, water, spread, types=types)
    env['terrain'] = terrain()
    positions = put_positions((x0, y0), rng.choice(n_choices), dx=dx, dy=dy)
    env['blocked'] = [p[:2] for p in positions if rng.random() < 0.15]
    weapon = rng.choice(weapon_choices)
    ammo = rng.choice([0, 1, -1, 1, 1])
    put_ammo(weapon, teams[own_team]['alliance'], ammo)
    write(DATA + 0x20, rng.choice([0, rng.randint(-0x2000, 0x2000)])); write(DATA + 0x24, rng.choice([0x3d70, 0x3d70, 0x2000]))
    return dict(ai=ai, worms=worms, teams=teams, scene=scene, word=word, own=own, positions=positions, weapon=weapon,
                ammo=ammo, x0=x0, y0=y0)
def relocate(s, prob, dx, dy):
    """Move some enemy tasks next to reachable positions (task memory and case data together)."""
    for i, w in enumerate(s['worms']):
        if i == 0 or not s['positions'] or rng.random() >= prob: continue
        px, py, _ = rng.choice(s['positions'])
        w['x'] = (px + rng.randint(-dx, dx)) * FX + rng.randint(0, 0xffff); w['y'] = (py + rng.randint(-dy, dy // 3)) * FX
        write(TASKS + i * 0x200 + 0x14, w['x']); write(TASKS + i * 0x200 + 0x18, w['y'])
def search_record(s, **extra):
    return dict(**world_record(s['ai'], s['worms'], s['teams'], s['scene'], s['word']), ownFlags=s['worms'][0]['flags'],
                positions=s['positions'], blocked=env['blocked'], weapon=s['weapon'], ammo=s['ammo'],
                wind=sread(DATA + 0x20), gravity=sread(DATA + 0x24), **extra)

# ---------------------------------------------------------------- gun evaluator 004F2D50
if wanted('gunSearch'):
    out = []
    for n in range(count(120)):
        s = search_setup([0, 1, 3, 8, 15], 300, GUNS)
        record = dict(range=rng.choice([0, 100, 400, 1000]), pellets=rng.choice([1, 2, 5]), damage=rng.choice([10, 25, 45]))
        put_record(s['weapon'], {0xa0: record['range'], 0x94: record['pellets'], 0x80: record['damage']})
        put_plan(PLAN_A, [0x2468ace] * 24); env['real'] = {0x4f2d50}
        r = run(0x4f2d50, [PLAN_A, s['weapon']])
        out.append(search_record(s, record=record, result=r, plan=plan_words(PLAN_A), seed=read(OBJ + 0x2954),
                                 calls=calls, **snapshot_state()))
    cases['gunSearch'] = out

# ---------------------------------------------------------------- melee box estimate 004CF4B0 via 004F23D0
if wanted('meleeShot'):
    out = []
    for n in range(count(150)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(100, 1800) * FX + rng.randint(0, 0xffff); y0 = rng.randint(500, 700) * FX + rng.randint(0, 0xffff)
        ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, spread=40,
                                                          count_range=(1, 6), water=rng.choice([700, 740, 760]))
        env['terrain'] = terrain()
        for w in worms[1:]:
            if rng.random() < 0.7:
                w['x'] = x0 + rng.randint(-22, 22) * FX + rng.randint(0, 0xffff); w['y'] = y0 + rng.randint(-60, 17) * FX
        own = reset(ai, scene, worms, teams); word = put_range_word(own_team, own_worm)
        env['terrain'] = terrain()
        facing = rng.choice([-1, 1]); x1, x2 = (-20, 0) if facing < 0 else (0, 20)
        y1 = rng.choice([-15 - rng.randint(0, 80), -40]); y2 = 15; damage = rng.choice([0, 30, 50, 30])
        if rng.random() < 0.2: facing = rng.choice([0, 3, -2])
        put_plan(PLAN_A, [0x1234567] * 24)
        r = run(0x4f23d0, [0x10, PLAN_A, x0, y0, x1, y1, x2, y2, damage, facing])
        out.append(dict(**world_record(ai, worms, teams, scene, word), args=[x0, y0, x1, y1, x2, y2, damage, facing],
                        result=r, plan=plan_words(PLAN_A), **snapshot_state()))
    cases['meleeShot'] = out

# ---------------------------------------------------------------- melee evaluator 004F2470
if wanted('meleeSearch'):
    out = []
    for n in range(count(100)):
        s = search_setup([0, 1, 2, 4, 6, 6], 60, [0x10] * 8 + [0x11, 0x12, 0x14, 0x23], water=rng.choice([700, 740]),
                         dx=40, dy=15)
        relocate(s, 0.9, 22, 60)
        record = dict(damage=rng.choice([20, 30]), rise=rng.choice([0, 20, 40, 100]))
        put_record(s['weapon'], {0x70: record['damage'], 0x7c: record['rise']})
        put_plan(PLAN_A, [0x2468ace] * 24); env['real'] = {0x4f2470}
        r = run(0x4f2470, [PLAN_A, s['weapon']])
        out.append(search_record(s, record=record, result=r, plan=plan_words(PLAN_A), seed=read(OBJ + 0x2954),
                                 calls=calls, **snapshot_state()))
    cases['meleeSearch'] = out

# ---------------------------------------------------------------- drop plan 004F1BF0
if wanted('dropShot'):
    out = []
    for n in range(count(200)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(100, 1800) * FX + rng.randint(0, 0xffff); y0 = rng.randint(500, 700) * FX + rng.randint(0, 0xffff)
        ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, spread=60)
        weapon = rng.choice([0x15, 0x16, 0x31])
        target = rng.choice(worms)
        px = target['x'] + rng.randint(-25, 25) * FX; py = target['y'] + rng.randint(-15, 15) * FX
        radius, damage = rng.choice([0, 50, 116]), rng.choice([0, 50, 75])
        put_plan(PLAN_A, [0x1234567] * 24)
        r = run(0x4f1bf0, [weapon, PLAN_A, px, py, target['x'], target['y'], radius, damage])
        out.append(dict(**world_record(ai, worms, teams, scene, word), weapon=weapon,
                        args=[px, py, target['x'], target['y'], radius, damage], result=r, plan=plan_words(PLAN_A)))
    cases['dropShot'] = out

# ---------------------------------------------------------------- drop evaluator 004F1FC0
if wanted('dropSearch'):
    out = []
    for n in range(count(100)):
        s = search_setup([0, 1, 4, 10, 25], 60, [0x15, 0x16, 0x31], dx=60, dy=12, types=(2, 2, 2, 10, 15))
        # Put some reachable spots right next to enemies so plans exist.
        for w in s['worms'][1:]:
            if rng.random() < 0.6 and len(s['positions']) < 0x40:
                p = [(w['x'] >> 16) + rng.randint(-15, 15), (w['y'] >> 16) + rng.randint(-6, 6), rng.randint(0, 0x1ff0)]
                cpu.mem_write(OBJ + 0x20f0 + 8 * len(s['positions']), struct.pack('<hhi', *p)); s['positions'].append(p)
        write(OBJ + 0x24f0, len(s['positions']))
        kind = rng.choice([1, 2, 0])
        record = dict(kind=kind, blast=rng.choice([20, 50, 75]), mode=rng.choice([0, 1]), extra=rng.choice([0, 3]),
                      extraCount=rng.choice([0, 5]))
        put_record(s['weapon'], {0x70: kind, 0x8c: record['blast'], 0x128: record['mode'], 0x150: record['extra'],
                                 0x130: record['extraCount']})
        escapes = [[(s['x0'] >> 16) + rng.randint(-200, 200), (s['y0'] >> 16) + rng.randint(-30, 30), rng.randint(0, 0x1ff0)]
                   for _ in range(rng.choice([0, 1, 3, 8]))]
        env['escapes'] = escapes
        env['blocked'] += [e[:2] for e in escapes if rng.random() < 0.1]
        write(OBJ + 0x28f4, rng.randint(0, 50)); cpu.mem_write(OBJ + 0x2ca2, bytes([rng.randint(0, 3)]))
        put_plan(PLAN_A, [0x2468ace] * 24); env['real'] = {0x4f1fc0}
        r = run(0x4f1fc0, [PLAN_A, s['weapon']])
        out.append(search_record(s, record=record, escapes=escapes, result=r, plan=plan_words(PLAN_A),
                                 seed=read(OBJ + 0x2954), escapeTable=[list(struct.unpack('<hhi', bytes(cpu.mem_read(OBJ + 0x24f4 + 8 * i, 8))))
                                                                         for i in range(sread(OBJ + 0x28f8))],
                                 escapeCount=sread(OBJ + 0x28f8), calls=calls, **snapshot_state()))
    cases['dropSearch'] = out

# ---------------------------------------------------------------- strike drop-line shot 004F1400
STRIKES = [0x1b, 0x1c, 0x1d, 0x2e, 0x32, 0x33, 0x36]
def strike_record(weapon):
    record = dict(aimed=rng.choice([0, 0, 1]), count=rng.choice([1, 3, 5]), spacing=rng.choice([0, 10, 30]),
                  speed=rng.choice([0, 25, 100, -50]), windPct=rng.choice([0, 50, 100]), blast=rng.choice([10, 30, 50]),
                  mode=rng.choice([0, 0, 1]), extra=rng.choice([0, 3]), extraCount=rng.choice([0, 4]))
    put_record(weapon, {0xc8: record['aimed'], 0x74: record['count'], 0x78: record['spacing'], 0x7c: record['speed'],
                        0x6c: record['windPct'], 0xa0: record['blast'], 0x13c: record['mode'], 0x164: record['extra'],
                        0x144: record['extraCount']})
    return record
if wanted('strikeShot'):
    out = []
    for n in range(count(300)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(50, 1850) * FX + rng.randint(0, 0xffff); y0 = rng.randint(300, 700) * FX + rng.randint(0, 0xffff)
        ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, spread=400)
        env['terrain'] = terrain()
        weapon = rng.choice(STRIKES); record = strike_record(weapon)
        write(DATA + 0x24, rng.choice([0x3d70, 0x2000, 0x8000]))
        target = rng.choice(worms)
        tx, ty = target['x'], target['y'] + rng.choice([0, -0x50000])
        ax = rng.choice([0, rng.randint(-0x800, 0x800)])
        radius, damage, direction = rng.choice([0, 30, 60, 150]), rng.choice([0, 30, 90]), rng.choice([-1, 1])
        put_plan(PLAN_A, [0x1234567] * 24)
        r = run(0x4f1400, [weapon, PLAN_A, x0, y0, tx, ty, ax, radius, damage, direction])
        out.append(dict(**world_record(ai, worms, teams, scene, word), weapon=weapon, record=record,
                        gravity=sread(DATA + 0x24), args=[x0, y0, tx, ty, ax, radius, damage, direction], result=r,
                        plan=plan_words(PLAN_A), **snapshot_state()))
    cases['strikeShot'] = out

# ---------------------------------------------------------------- strike evaluator 004F1A50
if wanted('strikeSearch'):
    out = []
    for n in range(count(100)):
        s = search_setup([0, 1, 3, 8, 15, 30], 500, STRIKES, dx=300, dy=40)
        record = strike_record(s['weapon'])
        put_plan(PLAN_A, [0x2468ace] * 24); env['real'] = {0x4f1a50}
        r = run(0x4f1a50, [PLAN_A, s['weapon']])
        out.append(search_record(s, record=record, result=r, plan=plan_words(PLAN_A), seed=read(OBJ + 0x2954),
                                 calls=calls, **snapshot_state()))
    cases['strikeSearch'] = out

# ---------------------------------------------------------------- teleport search 004F10A0
if wanted('teleportSearch'):
    out = []
    for n in range(count(80)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(100, 1800) * FX; y0 = rng.randint(400, 700) * FX
        ai, worms, teams, scene, word, own = common_world(own_team, own_worm, x0, y0, spread=600,
                                                          water=rng.choice([740, 900, 900]), types=(2, 2, 10, 11, 12, 15))
        env['terrain'] = terrain()
        held = rng.choice([0, 0, 0x28, 6]); write(OBJ + 0x2c9c, held)
        ammo = rng.choice([0, 1, -1, 1]); put_ammo(0x28, teams[own_team]['alliance'], ammo)
        write(OUT, 0x5555); write(OUT + 4, 0x6666)
        r = run(0x4f10a0, [OUT, OUT + 4])
        out.append(dict(**world_record(ai, worms, teams, scene, word), held=held, ammo=ammo, ownFlags=worms[0]['flags'],
                        result=r, out=[sread(OUT), sread(OUT + 4)], seed=read(OBJ + 0x2954), calls=calls,
                        **snapshot_state()))
    cases['teleportSearch'] = out

# ---------------------------------------------------------------- execution states
STATE_FUNCS = {0x6e: 0x4f2900, 0x6f: 0x4f1ac0, 0x70: 0x4f1b10, 0x71: 0x4f1bb0, 0x72: 0x4f1270, 0x73: 0x4f12e0,
               0x74: 0x4f1350, 0x75: 0x4f0e80, 0x76: 0x4f0ea0, 0x77: 0x4f0f10, 0x78: 0x4f2220, 0x79: 0x4f2270,
               0x7a: 0x4f2310}
if wanted('states'):
    out = []
    for n in range(count(500)):
        state = rng.choice(list(STATE_FUNCS))
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        x0 = rng.randint(200, 1700) * FX; y0 = rng.randint(500, 690) * FX
        wstate = rng.choice([0x64, 0x65, 0x66, 0x67, 0x68])
        plan = [0] * 24
        plan[1] = rng.choice([0x10, 0x15, 0x1b, 0xb, 0x28])
        for k in range(12, 18): plan[k] = rng.choice([0, 1, -1, rng.randint(-5, 5), (rng.randint(0, 1900) << 16) + rng.randint(0, 0xffff)])
        if state == 0x71: plan[15] = rng.randint(0, 5)  # escape row index (read past the count as zero rows)
        ai = dict(team=own_team, skill=rng.randint(0, 100), seed=rng.getrandbits(32), state=state, action=0x55,
                  nextState=rng.choice([0, 0x6c]), canAttack=rng.choice([0, 0, 1]), delay=3, replanned=1,
                  x=rng.randint(0, 99), y=rng.randint(0, 99), targetMode=7, fuse=2, snapTeam=own_team, snapWorm=own_worm)
        worms = [dict(team=own_team, worm=own_worm, x=x0, y=y0, own=True, state=wstate, flags=0x10)]
        for _ in range(rng.randint(0, 3)):
            worms.append(dict(team=rng.randint(0, 3), worm=rng.randint(1, 4), x=x0 + rng.randint(-200, 200) * FX,
                              y=rng.randint(560, 700) * FX, type=rng.choice([2, 2, 10, 15])))
        teams = random_teams(); scene = scene_values(rng.choice([700, 740]))
        reset(ai, scene, worms, teams)
        put_plan(OBJ + 0x2958, plan); write(OBJ + 0x295c, plan[1])
        for k in range(12, 18): write(OBJ + 0x2958 + 4 * k, plan[k])
        env['terrain'] = terrain()
        selected = rng.choice([plan[1], 0, 13]); write(TEAMTASK + 0x50, selected)
        route = put_route_bytes()
        escapes = put_positions((x0, y0), rng.choice([0, 2, 5]), 0x24f4, 0x28f8, dx=150, dy=30)
        env['escapes'] = [[(x0 >> 16) + rng.randint(-200, 200), (y0 >> 16) + rng.randint(-30, 30), rng.randint(0, 0x1ff0)]
                          for _ in range(rng.choice([0, 1, 4]))]
        run(STATE_FUNCS[state])
        routeBytes = {str(e[2]): route[4 + e[2]] for e in escapes + env['escapes'] + [[0, 0, 0]]}
        out.append(dict(state=state, ai=ai, plan=plan, wormState=wstate, selected=selected, worms=worms, teams=teams,
                        scene=scene, terrain=env['terrain'], escapes=escapes, pathEscapes=env['escapes'],
                        routeBytes=routeBytes, out=ai_snapshot(), outPlan=plan_words(OBJ + 0x2958), calls=calls,
                        **snapshot_state()))
    cases['states'] = out

# ---------------------------------------------------------------- teleport setup 004F0E40 and walk 004D0170
if wanted('misc'):
    out = []
    for n in range(count(60)):
        ai = dict(state=rng.choice([0x7b, 0x66]), nextState=0, delay=2, replanned=1, field2930=5, targetMode=9)
        reset(ai)
        x, y = rng.randint(-0x8000000, 0x8000000), rng.randint(-0x8000000, 0x8000000)
        run(0x4f0e40, [x, y])
        out.append(dict(kind='teleportSetup', ai=ai, args=[x, y], out=ai_snapshot()))
    for n in range(count(120)):
        ai = dict(state=0x6f, nextState=0, delay=2, replanned=1, field2930=5)
        reset(ai); route = put_route_bytes()
        entry = [rng.randint(-2000, 2000), rng.randint(-2000, 2000), rng.randint(0, 0x1ff0)]
        cpu.mem_write(OUT, struct.pack('<hhi', *entry))
        state = rng.choice([0x64, 0x69, 0x6c, 0x78, 0x6f])
        r = run(0x4d0170, [state, OUT])
        out.append(dict(kind='walk', ai=ai, entry=entry, routeByte=route[4 + entry[2]], state=state, result=r,
                        out=ai_snapshot()))
    # 004CDC10 plan start: stamp matches and plan already chosen (AI+0x2950 == stamp).
    for n in range(count(120)):
        team = rng.randint(0, 3); stamp = rng.randint(1, 1000)
        family = rng.choice([0, 1, 2, 3, 4, 5, 6])
        ai = dict(team=team, stamp=stamp, planned=stamp, delay=0, replanned=1, state=0x7d, nextState=0)
        worms = [dict(team=team, worm=1, x=500 * FX, y=500 * FX, own=True)]
        reset(ai, worms=worms, teams={team: dict(current=stamp)}); route = put_route_bytes()
        rows = put_positions((500 * FX, 500 * FX), 20)
        plan = [0] * 24; plan[0] = stamp; plan[6] = family
        for k in (14, 15, 18, 23): plan[k] = rng.randint(0, 19)
        put_plan(OBJ + 0x2958, plan)
        run(0x4cdc10)
        out.append(dict(kind='start', ai=ai, plan=plan, positions=rows,
                        routeBytes={str(r_[2]): route[4 + r_[2]] for r_ in rows}, out=ai_snapshot()))
    cases['misc'] = out

# ---------------------------------------------------------------- 004CE3A0 group search order
def random_plan():
    p = [0] * 24
    p[6] = rng.choice([0, 1, 2, 3, 4, 5, 3, 3])
    p[3] = rng.choice([0, rng.randint(1, 400), rng.randint(1, 4000)])
    p[4] = rng.choice([0, 0, rng.randint(1, 300)])
    for k in range(7, 24): p[k] = rng.randint(-1500, 1500) * FX + rng.randint(0, 0xffff) if rng.random() < 0.8 else rng.randint(-200, 200)
    p[7] = rng.randint(1, 50) * FX if p[6] in (1, 4) else p[7]
    p[10] = rng.randint(0, 200); p[21] = rng.randint(0, 0x30000)
    return p
ALL = [1, 6, 7, 8, 0x2a, 0x2b, 0x2f, 0xb, 0xc, 0xd, 0xe, 0x10, 0x11, 0x12, 0x14, 0x23, 0x15, 0x16, 0x31,
       0x1b, 0x1c, 0x1d, 0x2e, 0x32, 0x33, 0x36]
if wanted('order'):
    out = []
    for n in range(count(200)):
        own_team, own_worm = rng.randint(0, 3), rng.randint(1, 4)
        alliance = rng.randint(0, 5)
        x0 = rng.randint(200, 1700) * FX + rng.randint(0, 0xffff); y0 = rng.randint(400, 700) * FX
        ai = dict(team=own_team, skill=rng.randint(0, 100), aggression=rng.randint(0, 100), teams=rng.randint(1, 6),
                  seed=rng.getrandbits(32), canAttack=rng.choice([1, 1, 1, 0]), forced=rng.choice([0, 0, 0, 1]),
                  selected=rng.choice(ALL), wormWeapon=rng.choice([0, 0, 0, 0, 6, 11]), airStrike=rng.choice([0, 1]),
                  teamStamp=rng.getrandbits(31), snapTeam=own_team, snapWorm=own_worm)
        worms = [dict(team=own_team, worm=own_worm, x=x0, y=y0, own=True, flags=rng.choice([0x10, 0x12, 0x13]))]
        scene = {0x804: rng.choice([700, 740, 2000]), 0x7f0: rng.randint(0, 5000), 0x1acc: rng.getrandbits(32)}
        reset(ai, scene, worms, {own_team: dict(alliance=alliance)})
        env['terrain'] = terrain()
        write(TD + 0x2c10, rng.choice([0, 1]))
        ammo, weights, evaluators = {}, {}, {}
        for w in ALL:
            ammo[w] = rng.choice([0, -1, 1, 2, 5]); weights[w] = rng.choice([0, 1, 10, 100, rng.randint(1, 3000)])
            write(TD + (w + alliance * 0x8e) * 4 + 0x1eb8, ammo[w]); write(TD + (w + alliance * 0x8e) * 4 + 0x1fd4, 0)
            write(WEAPONS + w * 0x208 + 0x200, weights[w])
            row = EVAL + w * 0x80; plan = random_plan(); res = rng.choice([0, 1, 1])
            plan[0] = res; plan[1] = w
            for k in range(24): write(row + 4 * k, plan[k])
            evaluators[w] = dict(result=res, plan=plan)
        best = [0] * 24
        put_plan(PLAN_A, best)
        run(0x4ce3a0, [PLAN_A])
        out.append(dict(ai=ai, alliance=alliance, ownFlags=worms[0]['flags'], scene=scene, terrain=env['terrain'],
                        ammo=ammo, weights=weights, evaluators=evaluators, x0=x0, y0=y0, plan=plan_words(PLAN_A),
                        seed=read(OBJ + 0x2954), logicSeed=read(CTX + 0x1acc), dc8=read(OBJ + 0x2dc8),
                        globalList=[sread(GLOBAL_LIST), sread(GLOBAL_LIST + 4)], calls=calls, **snapshot_state()))
    cases['order'] = out

args.output.write_text(json.dumps(dict(
    executable_sha256=digest,
    method=__doc__.strip().split('\n\n')[1].replace('\n', ' '),
    counts={k: len(v) for k, v in cases.items()},
    cases=cases), separators=(',', ':')) + '\n')
print({k: len(v) for k, v in cases.items()})
