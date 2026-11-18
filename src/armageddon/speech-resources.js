import data from './speech-bank-data.json' with {type:'json'};
const catalog=data.banks;
import slots from './speech-slots.json' with {type:'json'};
import {nativeResolveSetupSpeech} from './speech-setup.js';

//Imported directories retain their original DOS short names. These aliases
//connect the native country-bank names to the shipped resource catalog.
const aliases={australian:'austra~1','danish-pyrus':'danish~1',hungarian:'hungar~1',
  norwegian:'norweg~1',portuguese:'portug~1'};
const directory=name=>{
  const key=String(name).toLowerCase(),resolved=aliases[key]??key;
  return Object.hasOwn(catalog,resolved)?resolved:null;
};
const encode=value=>new TextEncoder().encode(value+'\0');
const decode=bytes=>new TextDecoder().decode(bytes.subarray(0,bytes.indexOf(0)<0?bytes.length:bytes.indexOf(0)));
const resolvedBanks=new Map();
export function resolveOriginalSpeechBank(requested='English',fallback='English') {
  const key=JSON.stringify([requested,fallback]);
  if(resolvedBanks.has(key))return resolvedBanks.get(key);
  const memory=new Uint8Array(0x10000),teamData=new Uint8Array(0x9000),speech=0xd812;
  memory[0x11a]=1;memory.set(encode('voices'),speech);
  //Native team records reserve65 bytes for a speech-bank name.
  memory.set(encode(String(requested)).subarray(0,64),speech+0x81);
  const defaultSpeech=new Uint8Array(65);defaultSpeech.set(encode(String(fallback)).subarray(0,64));
  nativeResolveSetupSpeech(memory,teamData,{
    defaultSpeech,workingDirectory:encode('voices'),speechPath:()=>encode('voices'),
    changeDirectory:path=>{
      const value=decode(path),name=value.split('\\').pop();
      return value==='voices'||directory(name)?0:1;
    },
  });
  const result=directory(decode(memory.subarray(speech+0x81,speech+0x81+65)));
  resolvedBanks.set(key,result);return result;
}
export function originalSpeechClip(slot,bank='English') {
  const resolved=resolveOriginalSpeechBank(bank),entry=slots.slots[slot];
  return resolved&&entry&&catalog[resolved].includes(Number(slot))?`voices/${resolved}/${entry.clip}`:null;
}
