// Execute small, dependency-free routines from the user's verified WA 3.0 EXE.
// No game entry point, installers, imported functions or network code is called.
#include <windows.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void *routine(FILE *f, long address, size_t count) {
  void *code = VirtualAlloc(NULL,count,MEM_COMMIT|MEM_RESERVE,PAGE_READWRITE);
  if (!code || fseek(f,address-0x401000+0x400,SEEK_SET) || fread(code,1,count,f)!=count) exit(2);
  DWORD old; if (!VirtualProtect(code,count,PAGE_EXECUTE_READ,&old)) exit(3);
  FlushInstructionCache(GetCurrentProcess(),code,count); return code;
}
int main(int argc,char **argv) {
  if (argc!=2) return 1;
  FILE *f=fopen(argv[1],"rb"); if(!f)return 1;
  uint32_t (__attribute__((fastcall)) *logic)(void*)=routine(f,0x4ee960,47);
  uint32_t (__attribute__((fastcall)) *visual)(void*)=routine(f,0x4ee930,48);
  int32_t (__cdecl *mul)(int32_t,int32_t)=routine(f,0x4ae070,17);
  int32_t (__cdecl *divide)(int32_t,int32_t)=routine(f,0x4ae081,23);
  fclose(f);
  uint8_t task[64]={0},context[0x1ad4]={0}; *(void**)(task+0x38)=context;
  uint32_t seeds[]={0,1,42,78961,0x7fffffff,0x80000000,0xffffffff};
  uint32_t frames[]={0,0,1,1,2,50,0x7fffffff,0xffffffff,0};
  for(unsigned i=0;i<sizeof(seeds)/sizeof(*seeds);i++) {
    *(uint32_t*)(context+0x1acc)=seeds[i];*(uint32_t*)(context+0x1ad0)=seeds[i];
    for(unsigned j=0;j<sizeof(frames)/sizeof(*frames);j++) {
      *(uint32_t*)(context+0x7f0)=frames[j];
      uint32_t a=logic(task),b=visual(task);
      printf("{\"kind\":\"rng\",\"seed\":%u,\"index\":%u,\"frame\":%u,\"logic\":%u,\"visual\":%u}\n",seeds[i],j,frames[j],a,b);
    }
  }
  int32_t values[]={0,1,-1,32767,-32768,65535,65536,-65536,98304,-98304,0x7fffffff,(int32_t)0x80000000};
  for(unsigned i=0;i<sizeof(values)/sizeof(*values);i++) for(unsigned j=0;j<sizeof(values)/sizeof(*values);j++) {
    int32_t a=values[i],b=values[j];
    printf("{\"kind\":\"mul\",\"a\":%d,\"b\":%d,\"result\":%d}\n",a,b,mul(a,b));
    if(b && ((int64_t)a*65536/b)>=INT32_MIN && ((int64_t)a*65536/b)<=INT32_MAX)
      printf("{\"kind\":\"div\",\"a\":%d,\"b\":%d,\"result\":%d}\n",a,b,divide(a,b));
  }
  return 0;
}
