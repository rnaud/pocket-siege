"""Build numeric weapon records for every captured built-in scheme expansion."""
import argparse, json, subprocess, sys, tempfile
from pathlib import Path
p = argparse.ArgumentParser(description=__doc__)
p.add_argument('executable', type=Path)
p.add_argument('output', type=Path)
a = p.parse_args()
expanded = json.loads(Path('src/armageddon/scheme-runtime-data.json').read_text())
result = []
with tempfile.TemporaryDirectory(prefix='wa-scheme-records-') as folder:
    for scheme in expanded['schemes']:
        output = Path(folder) / 'weapons.json'
        subprocess.run([sys.executable, str(Path(__file__).with_name('weapon-oracle.py')), str(a.executable), str(output), '--scheme-resource-id', str(scheme['resource_id']), '--records-only'], check=True)
        native = json.loads(output.read_text())
        result.append({'resource_id':scheme['resource_id'], 'weapons':[
            [r['fields'][hex(offset)] for offset in range(0x48,0x208,4)] for r in native['records']]})
a.output.write_text(json.dumps({'executable_sha256':expanded['executable_sha256'], 'entry':'004B90A0', 'field_start':0x48, 'field_stride':4, 'method':'Original initializer with expanded built-in schemes; frontend handicaps zero and unpopulated context zero. Names replaced by empty strings. These records exclude team inventory and match-specific later overrides.', 'schemes':result}, separators=(',',':'))+'\n')
