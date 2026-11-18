import schemes from './scheme-data.json' with {type:'json'};
const resources = new Map(schemes.schemes.map(row => [row.resource_id,
  Uint8Array.from([83,67,72,77,1,...row.bytes]),
]));
export function originalSchemeResource(id) { return resources.get(id); }

//00470A20. CString label assignment and resource handles are platform services;
//resource selection, bank offsets, exact payload copy and flags are native.
export function nativeSelectSetupScheme(memory, owner, selection, bank, host) {
  selection |= 0; bank |= 0;
  if (bank > 3) {
    host.messageBox(`ERROR: Can't open Scheme type -  ${bank}`, 0, 0);
    return -1;
  }
  const [resource, label] = ({
    1:[0xc1,0x13ec],3:[0xc4,0x13ee],4:[0x11d,0x13ed],5:[0x11e,0x13ed],
    6:[0x14b,0x13f7],7:[0x14c,0x13ef],8:[0x14a,0x13f0],9:[0x154,0x13f6],
    10:[0x14e,0x13ed],11:[0x14f,0x13f4],12:[0x150,0x13ed],13:[0x151,0x13f5],
    14:[0x152,0x13f2],15:[0x153,0x13f3],16:[0x14d,0x13f1],17:[0x156,0x13f8],
  })[selection] ?? [0xc3,0x13ed];
  host.setResourceString(owner + 12, label);
  const handle = host.findResource ? host.findResource(0, resource, 'SCHEMES') : resource;
  const bytes = host.loadResource ? host.loadResource(0, handle) : originalSchemeResource(handle);
  const source = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const dest = (owner + 20 + Math.imul(bank, 216)) >>> 0;
  for (let offset = 0; offset < 216; offset += 4) memory.put(dest + offset, source.getUint32(5 + offset, true));
  memory.put(owner + 8, selection);
  memory.putByte(owner + 4, 0);
  return 0;
}
