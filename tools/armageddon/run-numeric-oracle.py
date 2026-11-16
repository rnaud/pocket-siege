"""Run the local x86 oracle: python3 tools/armageddon/run-numeric-oracle.py WA.EXE.

Requires i686-w64-mingw32-gcc and Wine. Outputs stay in gitignored research.
The executable must be the exact analyzed version before any code is executed.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("executable", type=Path)
parser.add_argument("--wine", default=shutil.which("wine") or
                    "/Applications/Wine Stable.app/Contents/Resources/wine/bin/wine")
args = parser.parse_args()
exe = args.executable.resolve()
expected = "0bf49876be886c8d213b8e28c761dbbfa5e030da38344cb6af9a2f162186ab56"
if hashlib.sha256(exe.read_bytes()).hexdigest() != expected:
    parser.error("Executable hash differs from analyzed WA 3.0.0.0; refusing to execute offsets")
root = Path(__file__).resolve().parents[2]
out = root / ".local-research/armageddon/oracle"
out.mkdir(parents=True, exist_ok=True)
binary = out / "numeric-oracle.exe"
subprocess.run(["i686-w64-mingw32-gcc", "-O2", "-Wall",
                str(Path(__file__).with_name("numeric-oracle.c")), "-o", str(binary)], check=True)
env = dict(os.environ, WINEDEBUG="-all")
env.setdefault("WINEPREFIX", str(out / "wine-prefix"))
result = subprocess.run([args.wine, str(binary), "Z:" + str(exe).replace("/", "\\")],
                        env=env, capture_output=True, text=True, check=True)
vectors = [json.loads(line) for line in result.stdout.splitlines()]
if len(vectors) != 317:
    raise RuntimeError(f"Expected 317 numeric vectors, got {len(vectors)}")
fixture = json.loads((root / "tests/fixtures/armageddon/numeric.json").read_text())
if vectors != fixture["vectors"]:
    raise RuntimeError("Native oracle results differ from committed fixture")
(out / "numeric-vectors.jsonl").write_text(result.stdout)
(out / "wine.log").write_text(result.stderr)
print("317 native cases match the port's reference fixture")
