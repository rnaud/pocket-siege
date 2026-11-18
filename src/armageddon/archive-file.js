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
  return file?host.loadArchiveDirectory(archive):0;
}
