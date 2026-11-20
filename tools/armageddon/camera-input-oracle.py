"""Execute original mouse-look 004ED5F0 and the worm frame camera dispatch 004DEF07..004DEF67."""
import argparse
import hashlib
import json
from pathlib import Path
import struct
from unicorn import Uc, UC_ARCH_X86, UC_MODE_32, UC_HOOK_CODE
from unicorn.x86_const import UC_X86_REG_EBX, UC_X86_REG_ECX, UC_X86_REG_EDI, UC_X86_REG_ESI, UC_X86_REG_ESP, UC_X86_REG_EIP, UC_X86_REG_EAX
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
owner, stack, stop, stubs, device, context = 0x2000000, 0x2100000, 0x2200000, 0x2300000, 0x2400000, 0x3000000
for address in [owner, stack, stop, stubs, device]: cpu.mem_map(address, 0x10000)
cpu.mem_map(context, 0x20000)
def write(address, value): cpu.mem_write(address, struct.pack('<I', value & 0xffffffff))
def read(address): return struct.unpack('<I', cpu.mem_read(address, 4))[0]
def signed(v): return v if v < 0x80000000 else v - 0x100000000

# Input device: vtable+4 writes (dx, dy, buttons) through its three pointer
# arguments and returns with ret 0xC; vtable+0xC is a no-argument reset.
read_stub, reset_stub, vtable = stubs, stubs + 0x100, stubs + 0x200
# Stub inputs live in data memory: Unicorn keeps translated code, so the
# stubs must not be patched between cases.
dx_slot, dy_slot, state_slot, moving_slot = device + 0x100, device + 0x104, device + 0x108, device + 0x10c
cpu.mem_write(read_stub, bytes.fromhex(
    '8b442404' '8b0d' + struct.pack('<I', dx_slot).hex() + '8908'
    '8b442408' '8b0d' + struct.pack('<I', dy_slot).hex() + '8908'
    '8b44240c' 'c70000000000'
    'c20c00'))
cpu.mem_write(reset_stub, bytes.fromhex('ff0510004002' 'c3'))  # inc dword [device+0x10]; ret
write(vtable + 4, read_stub); write(vtable + 0xc, reset_stub); write(device, vtable)
def set_delta(dx, dy):
    write(dx_slot, dx); write(dy_slot, dy)

mouse = []
write(owner + 0x38, context); write(context + 0x10, device)
for players, player_id in [([7], 7), ([3, 7], 7), ([3], 7), ([], 7)]:
    for suppression in [-5, -1, 0, 1, 99, 100]:
        for dx, dy in [(0, 0), (15, 0), (16, 0), (-16, 0), (0, 16), (8, 8), (8, -7), (-9, 7), (1, 0), (0, -1), (200, -300)]:
            write(owner + 0xcc, player_id); write(owner + 0x98, suppression)
            cpu.mem_write(context + 0x1b7da, struct.pack('<h', len(players)))
            for index, player in enumerate(players): cpu.mem_write(context + 0x1b7ba + 2 * index, struct.pack('<h', player))
            target = [0x01230000 + dx * 7, 0x00450000 - dy * 3, 0x00002000]
            for index, value in enumerate(target): write(context + 0x1c970 + 4 * index, value)
            write(device + 0x10, 0); set_delta(dx, dy)
            sp = stack + 0xff00; write(sp, stop)
            cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_ECX, owner)
            cpu.emu_start(0x4ed5f0, stop, count=20000)
            if cpu.reg_read(UC_X86_REG_EIP) != stop: raise RuntimeError('Mouse-look routine did not finish')
            mouse.append(dict(players=players, player=player_id, suppression=suppression, dx=dx, dy=dy,
                              target=target, after=[signed(read(context + 0x1c970 + 4 * i)) for i in range(3)],
                              suppressionAfter=signed(read(owner + 0x98)), polled=read(device + 0x10)))

# Worm frame dispatch: ebx is the state getter, esi the vtable whose +0xF4
# entry is the movement predicate. Calls to 004D6760 (camera) and 004EEBE0
# (activity) are recorded and returned without execution.
state_stub, predicate_stub, worm_vtable = stubs + 0x400, stubs + 0x500, stubs + 0x600
cpu.mem_write(state_stub, bytes.fromhex('a1' + struct.pack('<I', state_slot).hex() + 'c3'))
cpu.mem_write(predicate_stub, bytes.fromhex('a1' + struct.pack('<I', moving_slot).hex() + 'c3'))
write(worm_vtable + 0xf4, predicate_stub)
calls = []
def hook(uc, address, size, _):
    if address in (0x4d6760, 0x4eebe0):
        calls.append('camera' if address == 0x4d6760 else 'activity')
        sp = uc.reg_read(UC_X86_REG_ESP)
        uc.reg_write(UC_X86_REG_ESP, sp + 4); uc.reg_write(UC_X86_REG_EIP, read(sp))
cpu.hook_add(UC_HOOK_CODE, hook, begin=0x4d6760, end=0x4d6760)
cpu.hook_add(UC_HOOK_CODE, hook, begin=0x4eebe0, end=0x4eebe0)
frames = []
for state in range(0x60, 0x8c):
    for moving in [0, 1]:
        write(state_slot, state); write(moving_slot, moving)
        calls.clear()
        sp = stack + 0xff00
        cpu.reg_write(UC_X86_REG_ESP, sp); cpu.reg_write(UC_X86_REG_EDI, owner)
        cpu.reg_write(UC_X86_REG_EBX, state_stub); cpu.reg_write(UC_X86_REG_ESI, worm_vtable)
        cpu.emu_start(0x4def07, 0x4def67, count=2000)
        if cpu.reg_read(UC_X86_REG_EIP) != 0x4def67: raise RuntimeError('Worm frame dispatch did not finish')
        frames.append(dict(state=state, moving=moving, camera='camera' in calls, activity='activity' in calls))
args.output.write_text(json.dumps(dict(executable_sha256=digest,
    method='Original004ED5F0 with original004C5230/004C5210 and stubbed input device; original004DEF07..004DEF67 with stubbed state getter/predicate and recorded004D6760/004EEBE0 calls.',
    mouse=mouse, frames=frames), separators=(',', ':')) + '\n')
print(f'Captured {len(mouse)} mouse-look and {len(frames)} worm frame camera cases')
