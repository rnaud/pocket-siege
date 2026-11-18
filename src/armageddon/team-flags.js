//0044C7B0. Original filenames, including the original spellings. Invalid country
//IDs leave the caller's buffer untouched; negative IDs take the default case.
const names=['United Kingdom','Argentina','Australia','Austria','Belgium','Brazil',
  'Canada','Croatia','Bosnia','Cyprus','United Kingdom','Denmark','Finland','France',
  'Georgia','Germany','Greece','Hongkong','Hungary','Iceland','India','Indonesia',
  'Iran','Iraq','Ireland','Israel','Italy','Japan','Leichtenstein','Luxembourg',
  'Malaysia','Malta','Mexico','Morocco','Holland','New Zealand','Norway','Poland',
  'Portugal','Puerto Rico','Romania','Russia','Singapore','South Africa','Spain',
  'Sweden','Switzerland','Turkey','United States'];
export function nativeCountryFlag(buffer,country) {
  country|=0;
  if(country===0||country>=50)return -1;
  buffer.fill(0,0,65);
  buffer.set(new TextEncoder().encode(names[country-1]??names[0]));
  return 0;
}

//0041BC40. Positive human controller IDs retain the existing flag. CPU/default
//controllers select CPU-skill flags or country flags at the original addresses.
//The bitmap backend remains a host service; scratch can preserve caller bytes
//when testing invalid country IDs, whose native stack contents are unspecified.
export function nativeLoadSetupFlag(memory,owner,team,host) {
  const base=(owner+Math.imul(team,0xd7b))>>>0;
  const skill=memory.byte(base+0x620)<<24>>24;
  if(skill>=1)return;
  const level=Math.trunc((-skill+19)/20);
  let filename;
  if(level>=1&&level<=5)filename=`cpuflag${level}.bww`;
  else {
    const buffer=host.flagScratch??new Uint8Array(65);
    nativeCountryFlag(buffer,memory.get(0x6f47f4));
    const end=buffer.indexOf(0),name=new TextDecoder('windows-1252').decode(end<0?buffer:buffer.subarray(0,end));
    filename=`${name}.bmp`;
  }
  const path=`${String.fromCharCode(memory.byte(0x6e1178))}:\\data\\user\\flags\\${filename}`;
  host.loadFlagBitmap(path,base+0xb47,base+0x747,20,17);
}
