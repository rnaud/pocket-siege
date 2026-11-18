"""Transcode extracted original STREAMS WAV files for on-demand browser playback."""
import argparse, hashlib, json, subprocess, wave
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('streams',type=Path)
args=parser.parse_args()
out=Path('public/armageddon/music');out.mkdir(parents=True,exist_ok=True)
sources={'title':'TITLE.WAV','stats':'STATS.WAV','lose':'NEW-LOSE.WAV'}
sources.update({f'win-{i}':f'NEW-WI~{i}.WAV' for i in range(1,5)})
sources.update({f'sudden-{i}':f'SUDDEN~{i}.WAV' for i in range(1,3)})
sources.update({f'ingame-{i}':f'INGAME~{i}.WAV' if i<10 else f'INGAM~{i}.WAV' for i in range(1,12)})
tracks={}
for key,name in sources.items():
 source=args.streams/name;target=out/(key+'.m4a')
 subprocess.run(['/usr/bin/afconvert','-f','m4af','-d','aac','-b','96000',str(source),str(target)],check=True)
 with wave.open(str(source)) as wav: duration=wav.getnframes()/wav.getframerate()
 tracks[key]={'file':target.name,'source':name,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'duration':duration,'bytes':target.stat().st_size}
Path('src/armageddon/music-catalog.json').write_text(json.dumps({'encoding':'AAC 96 kbps; original full-length stereo streams','tracks':tracks},indent=2)+'\n')
print(f'Imported {len(tracks)} tracks, {sum(t["bytes"] for t in tracks.values())/1e6:.1f} MB')
