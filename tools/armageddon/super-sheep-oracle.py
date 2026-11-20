"""Execute the original mode3 unit routines that drive Sheep, Super Sheep and Aqua Sheep.

Routines run unchanged inside the projectile actor (vtable 00527090):
  004E44A0 message handler, events 0x414 (fire), 0x415/0x416 (steer)
  004E4090 take-off, 004E4170 loss of flight, 004E3E40 flight frame,
  004E3920 ground walk/hop frame.
Real body accessors, walk-position solver 004F4D80, impulse 004F4CB0,
sound wrapper 004F4260, trig 0049BFB0/0049BFF0 and both RNGs execute too.
Only scene services are supplied by hooks: terrain/object probe (scene 0x7D4
vtable +0xC), task events 004B26A0, sounds 004EDC90/004EDB90/004EDC30,
effect particles 004EE7F0, water entry 004F4FE0 and worm state 004C2D60.
"""
import argparse
import hashlib
import json
from pathlib import Path
import struct
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

OBJ, STACK, STOP, CTX, AUX = 0x2000000, 0x2100000, 0x2200000, 0x3000000, 0x2400000
for address, length in [(OBJ, 0x10000), (STACK, 0x10000), (STOP, 0x10000), (CTX, 0x30000), (AUX, 0x10000)]:
    cpu.mem_map(address, length)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000

# Scene: 0x7D4 collision world whose vtable+0xC is the occupancy probe.
COLL, COLL_VT, PROBE, MSGBUF = AUX, AUX + 0x100, AUX + 0x200, AUX + 0x1000
write(CTX + 0x7d4, COLL); write(COLL, COLL_VT); write(COLL_VT + 0xc, PROBE)
cpu.mem_write(PROBE, b'\xc3')

FIELDS = dict(
    flags=0x40, state=0x50, sprite=0x2ec, suspended=0x54, impulseScale=0x58, x=0x90, y=0x94, rest=0xb8,
    vx=0x9c, vy=0xa0, spin=0xa4, depth=0xb0, submerged=0xbc, contactX=0xc0, contactY=0xc4, soundHandle=0xf4,
    secondary=0x100, team=0x130, worm=0x134, baseFlags=0x2d4, field314=0x314, fireMode=0x32c,
    mode=0x330, walkFlags=0x334, flightFlags=0x338, walkSpeed=0x33c, climb=0x340,
    fallAngle=0x344, fallSpeed=0x348, fallSound=0x34c, hopAngle=0x350, hopSpeed=0x354,
    hopSound=0x358, flightSprite=0x36c, flightSprite2=0x370, releaseSound=0x374,
    flightLoop=0x378, timer=0x37c, firstFrame=0x388, inWater=0x38c, lastSound=0x390,
    phase=0x394, angle=0x398, direction=0x3c8, loopHandle=0x3d8, rotation=0x3dc,
)
# Default scheme (resource195) block words 0..41 copied to actor+0x2D4 by 004E1830.
BLOCKS = {
    23: [0,50,100,75,0,0,626,6,810,0,100,50,100,0,0,100,5000,20000,0,0,0,0,1,3,4331646,4331646,100,4,0,0,0,25,100,50,-10,0,0,0,0,0,0,0],
    24: [0,50,100,75,0,0,626,6,810,0,100,50,100,0,0,100,5000,20000,0,0,0,0,1,3,4331646,4331646,100,4,0,0,0,25,100,50,-10,0,0,0,632,633,76,65613],
    25: [0,50,100,75,0,0,626,6,810,0,100,200,100,0,0,100,5000,20000,0,0,0,0,1,3,4331646,137342,100,4,0,0,0,25,100,50,-10,0,0,0,634,635,76,65613],
}

env = {}
calls = []
def stub(cpu, name, nargs, result=0, thiscall=True):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    cpu.reg_write(UC_X86_REG_EAX, result & 0xffffffff)
    cpu.reg_write(UC_X86_REG_ESP, sp + 4 + 4 * nargs)
    cpu.reg_write(UC_X86_REG_EIP, read(sp))

def hook(cpu, address, size, user):
    sp = cpu.reg_read(UC_X86_REG_ESP)
    arg = lambda i: signed(read(sp + 4 + 4 * i))
    if address == PROBE:
        x, y = arg(1), arg(2)
        flags = read(OBJ + 0x40)
        hit = int(any(r[0] <= (x >> 16) <= r[2] and r[1] <= (y >> 16) <= r[3] and (not r[4] or flags & r[4])
                      for r in env['rectangles']))
        calls.append(dict(operation='probe', request=[x, y, flags], result=hit))
        stub(cpu, 'probe', 3, hit)
    elif address == 0x4b26a0:
        calls.append(dict(operation='event', request=[arg(1), arg(2), arg(3), arg(4), signed(read(arg(5) & 0xffffffff))]))
        stub(cpu, 'event', 6, 1)
    elif address == 0x4edc90:
        calls.append(dict(operation='sound', request=[arg(i) for i in range(5)]))
        stub(cpu, 'sound', 5, 1)
    elif address == 0x4edb90:
        env['handle'] += 1
        calls.append(dict(operation='loop', request=[arg(i) for i in range(5)], result=env['handle']))
        stub(cpu, 'loop', 5, env['handle'])
    elif address == 0x4edc30:
        calls.append(dict(operation='stopSound', request=[arg(0)]))
        stub(cpu, 'stop', 1)
    elif address == 0x4ee7f0:
        calls.append(dict(operation='particle', request=[arg(i) for i in range(12)]))
        stub(cpu, 'particle', 12, 1)
    elif address == 0x4f4fe0:
        calls.append(dict(operation='waterEntry', request=[]))
        stub(cpu, 'waterEntry', 0)
    elif address == 0x4c2d60:
        calls.append(dict(operation='wormState', request=[arg(0), arg(1)]))
        stub(cpu, 'wormState', 2, env['wormState'])
    elif address == 0x4eedf0:
        calls.append(dict(operation='draw', request=[arg(i) for i in range(6)]))
        stub(cpu, 'draw', 6)
for address in [PROBE, 0x4b26a0, 0x4edc90, 0x4edb90, 0x4edc30, 0x4ee7f0, 0x4f4fe0, 0x4c2d60, 0x4eedf0]:
    cpu.hook_add(UC_HOOK_CODE, hook, begin=address, end=address)
# Fail loudly if any other scene service is reached.
def guard(cpu, address, size, user):
    raise RuntimeError(f'Unhooked call target {address:#x}')
for address in [0x4f5850, 0x4ccf50, 0x492550, 0x4d37d0, 0x4edc10, 0x4e2ea0, 0x4f4410, 0x4aab40, 0x4c67a0, 0x4eed70, 0x49bf90]:
    cpu.hook_add(UC_HOOK_CODE, guard, begin=address, end=address)

def reset(slot, body, environment):
    cpu.mem_write(OBJ, b'\0' * 0x1000)
    write(OBJ, 0x527090); write(OBJ + 0x38, CTX)
    for i, w in enumerate(BLOCKS[slot]): write(OBJ + 0x2d4 + 4 * i, w)
    write(OBJ + 0x58, 0x10000); write(OBJ + 0x37c, 20000); write(OBJ + 0x3c8, 1)
    write(OBJ + 0x40, BLOCKS[slot][0] | BLOCKS[slot][24])
    for name, value in body.items(): write(OBJ + FIELDS[name], value)
    env.clear(); env.update(environment); env.setdefault('rectangles', []); env.setdefault('wormState', 0)
    env.setdefault('handle', 0x100)
    write(CTX + 0x804, env['water']); write(CTX + 0x7f0, env['frame'])
    write(CTX + 0x1acc, env['seed']); write(CTX + 0x1ad0, env['visualSeed']); write(CTX + 0x1b8c0, 0)

def snapshot():
    out = {name: signed(read(OBJ + offset)) for name, offset in FIELDS.items()}
    out['bubbles'] = signed(read(CTX + 0x1b8c0))
    out['seed'] = read(CTX + 0x1acc); out['visualSeed'] = read(CTX + 0x1ad0)
    return out

def run(address, stack_args=()):
    sp = STACK + 0xf000
    for i, value in enumerate([STOP, *stack_args]): write(sp + 4 * i, value)
    cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, OBJ)
    cpu.emu_start(address, STOP, count=200000)
    if cpu.reg_read(UC_X86_REG_EIP) != STOP: raise RuntimeError(f'{address:#x} did not return')

def op(kind, team=None):
    """One host step. Messages pass word0 (team) like the controller's 0x414..0x416 payloads."""
    if kind in ('fire', 'left', 'right'):
        write(MSGBUF, read(OBJ + 0x130) if team is None else team)
        run(0x4e44a0, [0, {'fire': 0x414, 'left': 0x415, 'right': 0x416}[kind], 4, MSGBUF])
    elif kind == 'takeOff': run(0x4e4090)
    elif kind == 'drop': run(0x4e4170)
    elif kind == 'flight': run(0x4e3e40)
    elif kind == 'walk': run(0x4e3920)
    elif kind == 'draw': run(0x4e27f0)
    elif kind == 'frame':
        # 004E48B8: mode3 dispatches flight while phase is 1, otherwise the ground walk.
        run(0x4e3e40 if read(OBJ + 0x394) == 1 else 0x4e3920)
    elif kind == 'tick':
        write(CTX + 0x7f0, read(CTX + 0x7f0) + 1)
    else: raise ValueError(kind)

def capture(slot, body, environment, ops, stop_on_state=False):
    global calls
    reset(slot, body, environment)
    start = snapshot()
    steps = []
    for entry in ops:
        kind, team = (entry, None) if isinstance(entry, str) else entry
        calls = []
        frame = read(CTX + 0x7f0)
        op(kind, team)
        if kind != 'tick':
            steps.append(dict(op=kind, team=team, frame=frame, calls=calls, body=snapshot()))
        if stop_on_state and read(OBJ + 0x50): break
    return dict(slot=slot, body=body, environment=environment, start=start, steps=steps)

FX = 1 << 16
cases = []
WATER = 600
base_env = dict(water=WATER, frame=1000, seed=0x12345678, visualSeed=0x9abcdef0)
ground = [[-5000, 400, 5000, 5000, 0]]

# 1. Message dispatch: every phase/variant/gate combination, single step.
for slot in (23, 24, 25):
    for phase in (0, 1, 2):
        for event in ('fire', 'left', 'right'):
            for team_match in (True, False):
                for y in (300 * FX + 5, (WATER + 10) * FX, WATER * FX, WATER * FX - 1):
                    for fire_mode in (0, 1, 2):
                        for submerged in (0, 1):
                            if submerged and (event != 'fire' or fire_mode != 1 or not team_match): continue
                            for angle in ((0, 0x7000, -0x5b0 * 3) if phase == 1 else (0,)):
                                body = dict(x=500 * FX + 0x1234, y=y, vx=3 * FX + 7, vy=-5 * FX - 11, team=2, worm=3,
                                            phase=phase, angle=angle & 0xffffffff, fireMode=fire_mode,
                                            submerged=submerged, loopHandle=0x77 if phase == 1 else 0,
                                            suspended=1 if phase == 1 else 0, timer=12340)
                                cases.append(capture(slot, body, base_env, [(event, 2 if team_match else 5)]))
message_count = len(cases)

# 2. Flight: take off from the ground, then steer for many frames.
def flight_case(slot, pattern, frames, start, rectangles=(), env=None, fire_at=()):
    ops = ['fire', 'tick']
    for frame in range(frames):
        if frame in fire_at: ops.append('fire')
        key = pattern(frame)
        if key: ops.append(key)
        ops.append('frame'); ops.append('tick')
    e = dict(base_env, rectangles=[list(r) for r in rectangles]); e.update(env or {})
    body = dict(x=start[0] * FX, y=start[1] * FX, team=1, worm=2, direction=1)
    return capture(slot, body, e, ops, stop_on_state=True)

patterns = {
    'none': lambda f: None,
    'right': lambda f: 'right',
    'left': lambda f: 'left',
    'zigzag': lambda f: 'right' if (f // 7) % 2 == 0 else 'left',
    'pulse': lambda f: 'left' if f % 3 == 0 else None,
}
for slot in (24, 25):
    for name, pattern in patterns.items():
        cases.append(flight_case(slot, pattern, 90, (900, 380)))
    # Terrain and object contact end flight through the failed move.
    cases.append(flight_case(slot, patterns['none'], 60, (900, 380), [(-5000, 250, 5000, 260, 0)]))
    cases.append(flight_case(slot, patterns['right'], 80, (900, 380), [(960, -5000, 980, 5000, 0)]))
    # Object probe that only matches flight flags bit 0x40 (worm-like mask).
    cases.append(flight_case(slot, patterns['right'], 80, (900, 380), [(940, 300, 950, 390, 0x40)]))
    # Dive into water: Super Sheep loses flight (0x400000), Aqua swims at half speed and resurfaces.
    dive = lambda f: 'right' if 6 <= f < 28 else ('left' if 40 <= f < 62 else None)
    cases.append(flight_case(slot, dive, 140, (900, 560)))
    # Fire during flight above water drops the sheep; fire again explodes.
    cases.append(flight_case(slot, patterns['zigzag'], 40, (900, 380), fire_at=(20,)))
    cases.append(flight_case(slot, patterns['none'], 30, (900, 580), fire_at=(8, 12, 16)))
    # Exact surface rows select speed and water handling on the pre- and post-move rows.
    for row in (WATER - 8, WATER - 1, WATER, WATER + 4):
        cases.append(flight_case(slot, patterns['none'], 6, (900, row)))
        cases.append(flight_case(slot, lambda f: 'right' if f < 23 else None, 30, (900, row)))

# 3. Ground walk and hop frames (Sheep family shares this routine).
walk_layouts = {
    'flat': [[-5000, 400, 5000, 5000, 0]],
    'step': [[-5000, 400, 5000, 5000, 0], [502, 397, 5000, 400, 0]],
    'cliff': [[-5000, 400, 501, 5000, 0]],
    'wall': [[-5000, 400, 5000, 5000, 0], [502, 300, 520, 400, 0]],
    'wallnear': [[-5000, 400, 5000, 5000, 0], [540, 380, 560, 400, 0]],
    'tunnel': [[-5000, 400, 5000, 5000, 0], [540, 380, 560, 400, 0], [-5000, 340, 5000, 345, 0]],
    'ahead60': [[-5000, 400, 5000, 5000, 0], [555, 385, 565, 392, 0]],
    'masked': [[-5000, 400, 5000, 5000, 0], [502, 300, 520, 400, 2]],
    'air': [],
}
walk_count = 0
for slot in (23, 24):
    for layout, rectangles in walk_layouts.items():
        for direction in (1, -1):
            for y in (399, 395):
                for overrides in ({}, dict(fallAngle=-1), dict(fallAngle=30, fallSpeed=80, fallSound=50),
                                  dict(hopAngle=-1), dict(hopAngle=0), dict(hopAngle=1), dict(lastSound=990),
                                  dict(soundHandle=0x55, hopSpeed=150)):
                    x = 500 if direction > 0 else 503
                    body = dict(x=x * FX + 0x8000, y=y * FX, team=1, worm=2, direction=direction & 0xffffffff, **overrides)
                    if direction < 0 and layout != 'air':
                        rectangles = [[1003 - r[2], r[1], 1003 - r[0], r[3], r[4]] for r in walk_layouts[layout]]
                    else:
                        rectangles = walk_layouts[layout]
                    cases.append(capture(slot, body, dict(base_env, rectangles=rectangles), ['walk']))
                    walk_count += 1
    # First release frame: owner still in state0x79 gives a launch hop.
    for state in (0x79, 0x78):
        for first, team in ((1, 1), (0, 1), (1, 0)):
            for direction in (1, -1):
                body = dict(x=500 * FX, y=399 * FX, team=team, worm=2, firstFrame=first, direction=direction & 0xffffffff)
                cases.append(capture(slot, body, dict(base_env, rectangles=ground, wormState=state), ['walk']))
                walk_count += 1
    # Moving, submerged and touching bodies do not walk.
    for gate in (dict(vx=1), dict(vy=-1), dict(spin=1), dict(depth=1), dict(depth=-1), dict(submerged=1),
                 dict(contactX=1), dict(contactY=-1)):
        body = dict(x=500 * FX, y=399 * FX, team=1, worm=2, **gate)
        cases.append(capture(slot, body, dict(base_env, rectangles=ground), ['walk']))
        walk_count += 1
    # Water surface clamp.
    for y in (WATER - 1, WATER, WATER + 3):
        body = dict(x=500 * FX, y=y * FX, team=1, worm=2)
        cases.append(capture(slot, body, dict(base_env, rectangles=[[-5000, WATER + 1, 5000, 5000, 0]]), ['walk']))
        walk_count += 1
    # A longer walk across bumpy ground on consecutive frames.
    bumps = [[-5000, 400, 5000, 5000, 0], [520, 398, 530, 400, 0], [560, 396, 575, 400, 0], [600, 390, 640, 400, 0]]
    cases.append(capture(slot, dict(x=500 * FX, y=399 * FX, team=1, worm=2), dict(base_env, rectangles=bumps),
                         [s for _ in range(40) for s in ('walk', 'tick')]))
    walk_count += 1

# 4. Draw routine 004E27F0 (event0x3EB) for flight and submerged units.
draw_start = len(cases)
for slot in (24, 25):
    for phase, submerged in ((1, 0), (1, 1), (0, 1), (2, 1)):
        for row in (300, WATER - 1, WATER, WATER + 20):
            for vx, vy in ((0, 0), (5 * FX, -3 * FX), (-8 * FX, 0), (0, 4 * FX + 3)):
                for direction in (1, -1):
                    if direction < 0 and (vx, vy) != (0, 0): continue
                    for frame in (0, 4, 5, 9, 10, 1234):
                        body = dict(x=700 * FX + 77, y=row * FX + 9, vx=vx, vy=vy, phase=phase, submerged=submerged,
                                    direction=direction & 0xffffffff, rotation=0x1357, team=1, worm=2)
                        cases.append(capture(slot, body, dict(base_env, frame=frame), ['draw']))
draw_count = len(cases) - draw_start

args.output.write_text(json.dumps(dict(
    executable_sha256=digest,
    method='Original004E44A0 events0x414..0x416,004E4090,004E4170,004E3E40 and004E3920 executed unchanged in a 00527090 actor with real body accessors, 004F4D80, 004F4CB0, 004F4260, trig and RNG; scene probe, task events, sounds, particles, water entry and worm state supplied by hooks and recorded in order.',
    fields=FIELDS, blocks=BLOCKS, counts=dict(messages=message_count, walks=walk_count, draws=draw_count, flights=len(cases) - message_count - walk_count - draw_count),
    cases=cases), separators=(',', ':')) + '\n')
print(f'Captured {len(cases)} cases ({message_count} messages, {walk_count} walks)')
