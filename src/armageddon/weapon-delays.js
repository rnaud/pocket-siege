//004E6630: advance all70 weapon delays, announcing only when a delay expires.
export function nativeAdvanceWeaponDelays(memory,host) {
  const body=new DataView(memory.buffer,memory.byteOffset,memory.byteLength);
  const team=body.getInt32(0x3c,true);let unlocked=false;
  for(let slot=1;slot<71;slot++) {
    const delay=host.weaponDelay(team,slot);
    if(delay>0) {
      host.setWeaponDelay(team,slot,(delay-1)|0);
      if(delay===1){body.setInt32(0xc8,1,true);unlocked=true;}
    }
  }
  if(!unlocked)return;
  const templates=host.weaponUnlockTemplates();
  const template=templates[(host.random()&0xff)%templates.length];
  const text=host.formatTeamAnnouncement(template,team);
  host.announce((body.getInt32(0x54,true)+0x11)|0,text);
  const sound=host.teamSound(team,7);host.sound(sound,8,65536,65536,0);
}
