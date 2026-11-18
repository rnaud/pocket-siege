"""Import original IMG/SPR/BMP/BWW visual media from the user's extracted DATA tree.

Preserves exact bytes and source paths; never imports executables or audio.
Archives use the Team17 DIR format. Existing shared sprites stay canonical.
"""
import argparse, hashlib, json, struct
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('data',type=Path)
parser.add_argument('--installed',type=Path)
args=parser.parse_args()
root=Path(__file__).resolve().parents[2]/'public/armageddon'
entries=[]
by_id={}
visual={'.img','.spr','.bmp','.bww'}
def archive_entries(data):
    if data[:4]!=b'DIR\x1a':raise ValueError('Unsupported archive signature')
    size,toc=struct.unpack_from('<II',data,4)
    if size!=len(data) or struct.unpack_from('<I',data,toc)[0]!=10:raise ValueError('Invalid archive header')
    seen=set()
    for entry in struct.unpack_from('<1024I',data,toc+4):
        while entry:
            if entry in seen:raise ValueError('Repeated archive entry')
            seen.add(entry);pos=toc+entry
            entry,offset,length=struct.unpack_from('<III',data,pos)
            name=data[pos+12:data.index(0,pos+12)].decode('ascii')
            member=Path(name.replace('\\','/'))
            if member.is_absolute() or '..' in member.parts or offset+length>toc:raise ValueError('Invalid archive member')
            yield name,data[offset:offset+length]
def save(source,payload,relative):
    relative=relative.replace("\\", "/")
    suffix=Path(relative).suffix.lower()
    if suffix not in visual:return
    if suffix=='.bww' and payload[:2]!=b'BM':raise ValueError('Unsupported BWW bitmap: '+source)
    digest=hashlib.sha256(payload).hexdigest()
    if relative in by_id:
        if by_id[relative]['sha256']==digest:
            by_id[relative]['sources'].append(source)
            return
        relative='installed-variant/'+relative
    if relative.startswith('gfx/gfx/') and suffix=='.spr':
        target='sprites/'+Path(relative).name
        if not (root/target).exists() or (root/target).read_bytes()!=payload:raise ValueError('Canonical sprite mismatch: '+source)
    else:
        target='media/'+relative
        path=root/target;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(payload)
    group='terrain' if relative.startswith(('custom/','level/')) else 'maps' if relative.startswith(('image/','mission/','training/')) else 'water' if relative.startswith('water/') else 'sprites' if suffix=='.spr' else 'interface'
    entries.append({'id':relative,'sources':[source],'path':target,'format':'bmp' if suffix=='.bww' else suffix[1:],'group':group,'bytes':len(payload),'sha256':digest})
    by_id[relative]=entries[-1]
sources=[(args.data,'disc/DATA','')]
if args.installed:
    sources.extend([(args.installed/'DATA','installed/DATA',''),(args.installed/'graphics','installed/graphics','graphics/')])
for directory,label,prefix in sources:
    for path in sorted(directory.rglob('*')):
        if not path.is_file():continue
        relative=path.relative_to(directory).as_posix()
        if path.suffix.lower()=='.dir':
            for name,payload in archive_entries(path.read_bytes()):
                save(label+'/'+relative+'/'+name,payload,prefix+Path(relative).with_suffix('').as_posix().lower()+'/'+name.lower())
        elif path.suffix.lower() in visual:save(label+'/'+relative,path.read_bytes(),prefix+relative.lower())
entries.sort(key=lambda v:v['id'])
if len({v['id'] for v in entries})!=len(entries):raise ValueError('Duplicate media IDs')
(root/'media.json').write_text(json.dumps({'source':'User-provided Worms Armageddon 3.0.0.0 DATA tree','assets':entries},indent=2)+'\n')
from collections import Counter
print(len(entries),'visual assets',dict(Counter(v['format'] for v in entries)),dict(Counter(v['group'] for v in entries)))
