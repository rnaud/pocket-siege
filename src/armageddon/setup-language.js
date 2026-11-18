//0044BCA0: Windows LCID -> original country code, stored at object+4.
export function nativeLocaleCountry(memory,lcid) {
  const primary=lcid&0x3ff,sub=(lcid>>>10)&63;
  const fixed={5:11,6:12,8:17,11:13,13:26,14:19,15:20,17:28,20:37,21:38,24:41,25:42,26:8,31:48,33:22,54:44};
  let country=fixed[primary]??1;
  switch(primary) {
    case 1:country=sub===2?24:sub===6?34:1;break;
    case 4:country=sub===3?18:sub===4?43:1;break;
    case 7:country=({2:47,3:4,4:30,5:29})[sub]??16;break;
    case 9:country=({1:49,3:3,4:7,5:36,6:25,7:44})[sub]??1;break;
    case 10:country=sub===2?33:sub===11?2:sub===20?40:45;break;
    case 12:country=sub===2?5:sub===3?7:sub===4?47:14;break;
    case 16:country=sub===2?47:27;break;
    case 19:country=sub===2?5:35;break;
    case 22:country=sub===1?6:39;break;
    case 29:country=sub===2?13:46;break;
  }
  new DataView(memory.buffer,memory.byteOffset,memory.byteLength).setInt32(4,country,true);
  return country;
}

//0044D500: installed German resources override the system country selection.
export function nativeSetupLanguage(memory,systemLocale,loadResource) {
  const country=nativeLocaleCountry(memory,systemLocale());
  const resource=loadResource(8);
  const end=resource.indexOf(0),text=new TextDecoder().decode(end<0?resource:resource.subarray(0,end));
  if(text==='Verbindung nicht initialisiert.')return 1;
  if([2,33,40,45].includes(country))return 3;
  if([4,16,29,30,47].includes(country))return 1;
  if([5,14].includes(country))return 6;
  if([6,39].includes(country))return 0;
  return ({27:2,35:4,46:5})[country]??7;
}
