"""Translate004B90A0 base record construction, keeping every write and branch."""
import re,sys
from pathlib import Path
source=Path(sys.argv[1]).read_text()
start=source.index('  *(undefined4 *)(iVar10 + 0x1260c)')
end=source.index('  *(uint *)(*(int *)(param_1 + 0x2a0) + 0x1bea0)')
body=source[start:end]
# Replace compiler-expanded strlen/copy loops with a byte-exact C string copy.
pattern=r'  pcVar4 = \(char \*\)\(\*\*\(code \*\*\).*?\+ (0x[0-9a-f]+|[0-9]+)\)\)\(\);.*?pcVar16 = \(char \*\)\(iVar10 \+ (0x[0-9a-f]+|[0-9]+)\);.*?for \(uVar7 = uVar7 & 3;.*?\n  }'
body,n=re.subn(pattern,lambda m:f'  name({m[2]},{m[1]});',body,flags=re.S)
assert n==142,n
body=body.replace('  iVar10 = *(int *)(param_1 + 0x2a0);\n','')
body=body.replace('*(int *)(param_1 + 0x2a0)','iVar10')
# Ghidra omits the thiscall destinations. Recover these from the four ECX
# assignments immediately before calls at4BEB7B/4BEE25/4BEF08/4BF4B4.
destinations=iter([0x18124,0x1567c,0x15884,0x18f5c])
body=re.sub(r'FUN_004c2320\(iVar10 \+ (0x[0-9a-f]+)\)',lambda m:f'clone({hex(next(destinations))},{m[1]})',body)
body=re.sub(r'&(?:LAB|DAT)_([0-9a-f]+)',lambda m:'0x'+m[1],body)
body=re.sub(r'\*\((undefined1?|undefined[24]) \*\*\)',r'*(undefined4 *)',body)
# Turn stores into calls before rewriting loads; exclude equality conditions.
body=re.sub(r'\*\((undefined[124]|uint) \*\)\(([^)]+)\)\s*=(?!=)\s*([^;]+);',lambda m:('put8' if m[1]=='undefined1' else 'put16' if m[1]=='undefined2' else 'put')+'('+m[2]+','+m[3]+');',body)
body=re.sub(r'\*\((undefined[124]|uint|char) \*\)\(([^)]+)\)',lambda m:('u8' if m[1] in ['undefined1','char'] else 'u16' if m[1]=='undefined2' else 'get')+'('+m[2]+')',body)
# Pointer locals retain byte offsets; increments of undefined4* advance4 bytes.
body=re.sub(r'(puVar1[2345] = puVar1[2345] \+ )1;',r'\g<1>4;',body)
body=re.sub(r'\*puVar(1[2345]) = \*puVar(1[2345]);',r'put(puVar\1,get(puVar\2));',body)
body=body.replace('*puVar1','u8(puVar1)')
body=re.sub(r'\(undefined[14] \*\)','',body).replace("'\\0'",'0')
assert not any(x in body for x in ['undefined','pcVar','FUN_','DAT_','LAB_','*(']),body
header='''// Generated from004B90A0 by tools/armageddon/build-weapon-initialization.py.
import {nativeApplyWeaponOverrides} from './weapon-overrides.js';

export function nativeInitializeWeaponRecords(memory,localizedName) {
  const view=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const u8=o=>view.getUint8(o),u16=o=>view.getUint16(o,true),get=o=>view.getInt32(o,true);
  const put=(o,v)=>view.setInt32(o,v,true),put8=(o,v)=>view.setUint8(o,v),put16=(o,v)=>view.setUint16(o,v,true);
  const name=(offset,method)=> {
    const bytes=localizedName(method);let i=0;
    do {memory[offset+i]=bytes[i]??0;} while(memory[offset+i++]);
  };
  const clone=(destination,source)=> {
    for(const offset of [4,0x25])for(let i=0;i<33;i++)put8(destination+offset+i,u8(source+offset+i));
    for(let i=0x48;i<0x6c;i+=4)put(destination+i,get(source+i));
    for(const count of [0x60,0x60,0x65,0x5f])for(let i=0;i<count;i++)put(destination+0x6c+i*4,get(source+0x6c+i*4));
    put(destination+0x200,get(source+0x200));put(destination+0x204,get(source+0x204));
  };
  for(let bank=0;bank<u8(0x114e0);bank++) {
    if(u8(0x11d72)) {put16(0x11516+bank*0x11e,u16(0x11514+bank*0x11e));put16(0x11514+bank*0x11e,0);}
    else put16(0x11516+bank*0x11e,0);
  }
  memory.fill(0,0x125bc,0x1b5f4);
  for(let slot=1;slot<=71;slot++){put(0x1be98+slot*4,-1);put(0x1bfb4+slot*4,1);}
  put(0x1be9c,0);put(0x1bf80,0);put(0x1bf84,0);put(0x12604,0);
  // Original561F7C is the literal "None", including its terminator.
  memory.set([78,111,110,101,0],0x125c0);memory.set([78,111,110,101,0],0x125e1);
  let iVar10=0,iVar6=0,uVar7=0,uVar8=0,puVar1=0,puVar12=0,puVar13=0,puVar14=0,puVar15=0;
'''
Path('src/armageddon/weapon-initialization.js').write_text(header+body+'  nativeApplyWeaponOverrides(memory);\n}\n')
