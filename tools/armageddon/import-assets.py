"""Import the original media from already extracted disc/installer folders.

Usage: python3 tools/armageddon/import-assets.py GFX_FOLDER EFFECTS_FOLDER SPEECH_FOLDER
GFX_FOLDER is the output of extract-dir.py applied to DATA/Gfx/Gfx.dir.
"""
import argparse
import json
from pathlib import Path
import shutil

parser = argparse.ArgumentParser(description=__doc__)
for name in ('gfx', 'effects', 'speech'):
    parser.add_argument(name, type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2] / 'public/armageddon'

def copy_files(source, destination, suffix):
    destination.mkdir(parents=True, exist_ok=True)
    names = []
    for file in sorted(source.iterdir()):
        if file.is_file() and file.suffix.lower() == suffix:
            name = file.name.lower()
            shutil.copyfile(file, destination / name)
            names.append(name)
    return names

sprites = copy_files(args.gfx, root / 'sprites', '.spr')
effects = copy_files(args.effects, root / 'sounds', '.wav')
voices = {bank.name.lower(): copy_files(bank, root / 'voices' / bank.name.lower(), '.wav')
          for bank in sorted(args.speech.iterdir()) if bank.is_dir()}
if len(sprites) != 770 or len(effects) != 123 or len(voices) != 49:
    raise ValueError('Unexpected asset count for the analyzed 3.0.0.0 disc')
for name, data in [('sprites', [Path(n).stem for n in sprites]), ('sounds', effects), ('voices', voices)]:
    (root / f'{name}.json').write_text(json.dumps(data))
print(f'Imported {len(sprites)} animations, {len(effects)} effects, {len(voices)} voice banks')
