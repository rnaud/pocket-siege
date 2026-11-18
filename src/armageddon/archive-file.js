import {nativeLoadArchiveDirectory} from './archive-directory.js';
//004AD0F0 followed by004CC3D0. Other directory fields remain untouched.
export function nativeCreateFileArchive(memory,archive) {
  memory.put(archive,0x5265d8);memory.put(archive+0x194,0);
  memory.put(archive,0x526938);memory.put(archive+0x198,0);
  return archive;
}

//004CC460. Store the file handle before directory decoding, including failure.
export function nativeOpenFileArchive(memory,archive,path,host) {
  const file=host.openFile(path,'rb');
  memory.put(archive+0x198,file);
  if(!file)return 0;
  if(host.loadArchiveDirectory)return host.loadArchiveDirectory(archive);
  return nativeLoadArchiveDirectory(memory,archive,host.archiveScratch,{
    ...host,
    //004CC4D0 reports the full requested count or zero, even on partial reads.
    readArchive:(at,dest,size)=>host.readFile(dest,1,size,memory.get(at+0x198))===size?size:0,
    seekArchive:(at,offset)=>Number(host.seekFile(memory.get(at+0x198),offset,0)===0),
    archiveView:()=>0, //004AD650: file archives never expose mapped memory.
  });
}
