//004CA7E0 inner traversal. Preserve non-null membership order, including duplicates.
export function nativeCompactPhysicsEntries(length,read,write) {
  let count=0;
  for(let index=0;index<(length|0);index++) {
    const body=read(index);
    if(body)write(count++,body);
  }
  return count;
}
