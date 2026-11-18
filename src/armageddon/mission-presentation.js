import {resolveMissionDefinition} from './mission-files.js';
import {nativeCreateMissionOwner} from './mission-owner.js';
import {nativeMissionTitle,nativeMissionBriefing,nativeMissionThumbnail} from './mission-resources.js';

// Browser presentation adapter. Scenario filenames identify the WAM, while its
// Description/Name selects the original resource strings and thumbnail.
export function originalMissionPresentation(path) {
  const record=resolveMissionDefinition(path);
  const match=path.match(/^mission\/(mission|training)(\d+)\.wam$/i);
  if(!record||!match)return null;
  const bytes=new DataView(new ArrayBuffer(0x1000));
  const memory={get:a=>bytes.getUint32(a,true),put:(a,v)=>bytes.setUint32(a,v>>>0,true)};
  nativeCreateMissionOwner(memory,0,{initializeString:a=>memory.put(a,0),time:()=>0,seedRandom:()=>{}});
  const training=match[1].toLowerCase()==='training';
  memory.put(0x884,training?-1:Number(match[2]));
  memory.put(0x54,training?Number(match[2]):-1);
  const host={profileInt:(section,key,fallback)=>{
    const value=record.sections.find(s=>s.name.toLowerCase()===section.toLowerCase())?.entries.find(([k])=>k.toLowerCase()===key.toLowerCase())?.[1];
    return value===undefined?fallback:parseInt(value,10);
  }};
  return {
    title:nativeMissionTitle(memory,0,host).trim(),
    briefing:nativeMissionBriefing(memory,0,host).trim(),
    thumbnail:training?null:nativeMissionThumbnail(memory,0,host).replaceAll('\\','/'),
  };
}
