import catalog from './mission-catalog.json' with {type:'json'};
import names from './mission-names.json' with {type:'json'};

const definitions = new Map(catalog.records.map(record => [record.source.toLowerCase(), record]));
// Browser resource boundary for the original CD file paths. Long names come
// from ISO directory extents, not WAM MissionNumber or guessed DOS aliases.
export function resolveMissionDefinition(path) {
  const name = path.replaceAll('\\', '/').replace(/^[a-z]:\/data\//i, '')
    .replace(/^data\//i, '').toLowerCase();
  if (!name.startsWith('mission/')) return null;
  const source = names[name]?.toLowerCase() ?? name.slice('mission/'.length);
  return definitions.get(source) ?? null;
}

// CFile lifecycle adapter for nativeSelectMission/nativeSelectTraining. The
// memory/string allocator remains owned by the composed native setup host.
export function missionFileServices(strings) {
  return {
    assignString: (address, value) => strings.assignString(address, value),
    createFile: () => ({record:null}),
    openFile: (file, filename, flags, exception) => {
      if (flags !== 0x8000 || exception !== 0) throw new Error('Unsupported mission file open mode');
      file.record = resolveMissionDefinition(strings.readString(filename));
      return file.record ? 1 : 0;
    },
    closeFile: file => {file.record = null;},
    destroyFile: file => {file.record = null;},
  };
}
