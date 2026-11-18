//004B7A80. Both output positions survive failed probes, as in the pointer API.
export function nativeCrateSpawnColumn(x, y, bottom, grounded, collide) {
  const groundX=x; let groundY=y;
  const result=success=>({success,x,y,groundX,groundY});
  if(collide(5,x,y,0x1806))return result(false);
  let hit=collide(5,groundX,(groundY+0x80000)|0,0x1806);
  while(!hit && groundY<((bottom-64)<<16)) {
    groundY=(groundY+0x80000)|0;
    hit=collide(5,groundX,(groundY+0x80000)|0,0x1806);
  }
  if(!collide(5,groundX,(groundY+0x80000)|0,0x1806))return result(false);
  if(grounded){x=groundX;y=groundY;return result(true);}
  hit=collide(5,x,(y-0x80000)|0,0x1806);
  while(!hit && y>-0x1000000) {
    y=(y-0x80000)|0;
    hit=collide(5,x,(y-0x80000)|0,0x1806);
  }
  return result(true);
}

//004B7C00, composed with the original column probe. Native landscape bounds
// are fixed here; browser dimensions must be adapted at the integration boundary.
export function nativeCrateSpawnSearch(bottom, tall, grounded, avoidActors, host) {
  let position;
  for(let attempt=0;attempt<75;attempt++) {
    const x=(((host.random()&65535)%0x740)+32)<<16;
    const y=((host.random()&65535)%(tall?1920:480))<<16;
    position=nativeCrateSpawnColumn(x,y,bottom,grounded,host.collide);
    if(!position.success)continue;
    if(avoidActors) {
      const distance=host.nearest(position.groundX,position.groundY,0x21c04);
      if(distance!==null && distance<0x400000)continue;
    }
    if(position.groundY<((bottom-32)<<16) && position.groundY>0)
      return {...position,success:true};
  }
  return {...position,success:false};
}
