"""Capture native crate quantities and eligibility inputs for built-in schemes."""
import argparse,json,subprocess,sys,tempfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('executable',type=Path);p.add_argument('output',type=Path)
a=p.parse_args()
expanded=json.loads(Path('src/armageddon/scheme-runtime-data.json').read_text())
rows=[]
with tempfile.TemporaryDirectory(prefix='wa-crate-schemes-') as folder:
 for scheme in expanded['schemes']:
  output=Path(folder)/'records.json'
  subprocess.run([sys.executable,str(Path(__file__).with_name('weapon-oracle.py')),str(a.executable),str(output),'--scheme-resource-id',str(scheme['resource_id']),'--records-only'],check=True)
  data=json.loads(output.read_text())
  rows.append(dict(resource_id=scheme['resource_id'],ammo=data['crate_ammo'],scene=data['crate_scene'],descriptors=[r['fields']['0x50'] for r in data['records']]))
a.output.write_text(json.dumps(dict(executable_sha256=expanded['executable_sha256'],entry='004B90A0',method='Original weapon initializer with expanded built-in schemes; localized names empty and frontend handicaps/unpopulated context zero. Crate ammo at1BFB8, descriptor50 eligibility and scene flags captured. Later match/mission overrides remain separate.',schemes=rows),separators=(',',':'))+'\n')
