"""Translate the recovered linear weapon-settings block into explicit writes.
Input is Ghidra's00415540.c; generated output is checked against native captures.
"""
import argparse,re
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('decompiled',type=Path);args=parser.parse_args()
s=args.decompiled.read_text();s=s[s.index('  *(char *)(param_1 + 0xd43a)'):s.index('  tVar14 = time')]
start=s.index('  switch(DAT_006f45e5)');end=s.index('  *(undefined1 *)(param_1 + 0xd550)',start)
s=s[:start]+'''  const choice=signed(0x85);
  const [uVar2,local_54,uVar9]=choice===0?[0,70,2]:choice===1?[1,80,2]:choice===2?[1,90,1]:choice===3?[3,100,1]:[255,110,1];
'''+s[end:]
# All recovered scale expressions use positive table values; destination writes
# implement byte/short truncation after signed division by100.
s=re.sub(r'\(\((?:char|short)\)\(iVar6 / 100\) \+ \((?:char|short)\)\(iVar6 >> 0x1f\)\) -\s*\((?:char|short)\)\(\(longlong\)iVar6 \* 0x51eb851f >> 0x3f\)', 'Math.trunc(value/100)',s)
s=s.replace('DAT_006f4560._1_1_','scheme[1]')
s=re.sub(r'DAT_([0-9a-f]{8})',lambda m:f'signed(0x{int(m[1],16)-0x6f4560:x})',s)
s=s.replace('iVar6','value').replace('(int)','')
s=re.sub(r'local_50\[([^\]]+)\]',r'power(\1)',s)
def char(m):
 text=m[1];return str(ord(bytes(text,'ascii').decode('unicode_escape')))
s=re.sub(r"'([^']*)'",char,s)
def write(m):
 size=m[1];offset=m[2];expr=' '.join(m[3].split())
 return f'  '+(f'word({offset},{expr});' if size in ['short','undefined2'] else f'memory[{offset}]={expr};')
s=re.sub(r'\s*\*\((char|short|undefined1|undefined2) \*\)\(param_1 \+ (0x[0-9a-f]+)\) =\s*(.*?);',write,s,flags=re.S)
s=s.replace(';  memory',';\n  memory').replace(';  word',';\n  word')
assert not any(token in s for token in ['param_1','DAT_','local_50','longlong','goto','LAB_'])
header='''//Generated from00415540 weapon-settings expansion by build-weapon-settings.py.
//004156DC..00417268. Original valid power selections are0..4; malformed
//indices outside the native20-word scale table are not emulated stack reads.
export function nativeExpandWeaponSettings(memory,scheme) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const word=(offset,value)=>view.setInt16(offset,value,true);
  const signed=offset=>scheme[offset]<<24>>24;
  const scales=[80,90,100,110,120,80,90,100,110,120,50,70,100,150,200,50,70,100,130,150];
  const power=index=>{if(index<0||index>=scales.length)throw new RangeError('Invalid native power table index');return scales[index];};
  let value=0;
'''
Path('src/armageddon/weapon-settings.js').write_text(header+s+'}\n')
print('Generated explicit weapon-settings writes')
