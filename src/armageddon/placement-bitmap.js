// One-bit placement-surface path of00493380/004933C0, without reflection.
// Pixels are unpacked here; native storage uses aligned packed one-bit rows.
export function nativePlacementBitmapBlit(destination,x,y,width,height,source,sx,sy,mode) {
  if(!Number.isInteger(mode) || mode<0 || mode>5)throw new RangeError('Unsupported placement bitmap operation');
  if(!width || !height)return 0;
  const clip=destination.clip ?? [0,0,destination.width,destination.height];
  const left=Math.max(clip[0],x),top=Math.max(clip[1],y);
  const right=Math.min(clip[2],x+width),bottom=Math.min(clip[3],y+height);
  if(left>=right || top>=bottom)return 0;
  for(let py=top;py<bottom;py++)for(let px=left;px<right;px++) {
    const index=py*destination.width+px;
    const tx=sx+px-x,ty=sy+py-y;
    const value=source.pixels[ty*source.width+tx] ? 1 : 0;
    const current=destination.pixels[index];
    if(mode===5) {if(current && value)return 1;continue;}
    if(mode===0 || (mode===1 && value) || (mode===2 && value && current) || (mode===3 && value && !current))destination.pixels[index]=value;
    else if(mode===4 && value)destination.pixels[index]=0;
  }
  return mode===5?0:1;
}
