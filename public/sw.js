const CACHE='pocket-siege-shell-v13';
const MEDIA='pocket-siege-media-v1';
const REVISION='__ASSET_MANIFEST_REVISION__';
let manifestPromise;
async function mediaManifest() {
  if(!manifestPromise)manifestPromise=(async()=>{
    const cache=await caches.open(MEDIA),key=new URL('asset-manifest.json',self.registration.scope);
    try {
      const response=await fetch(`${key.href}?v=${REVISION}`,{cache:'no-cache'});
      if(!response.ok)throw new Error('Manifest unavailable');
      const data=await response.clone().json();
      if(!data.assets)throw new Error('Invalid manifest');
      await cache.put(key,response);return data.assets;
    } catch {return (await cache.match(key))?.json().then(data=>data.assets)??{};}
  })();
  return manifestPromise;
}
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try {for(const key of await caches.keys())
    if(key!==CACHE&&(key.startsWith('pocket-siege-shell-')||key.startsWith('pocket-siege-armageddon-')))await caches.delete(key);}catch{}
  await self.clients.claim();
})()));
async function rangeResponse(response,range) {
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match)return response;
  const bytes=await response.arrayBuffer(),size=bytes.byteLength;
  const start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  const end=match[1]&&match[2]?Math.min(size-1,Number(match[2])):size-1;
  if(start> end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  const headers=new Headers(response.headers);
  headers.delete('Content-Encoding');headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
  headers.set('Content-Length',String(end-start+1));headers.set('Accept-Ranges','bytes');
  return new Response(bytes.slice(start,end+1),{status:206,headers});
}
async function originalMedia(request,url) {
  const cache=await caches.open(MEDIA),manifest=await mediaManifest();
  const revision=request.headers.get('X-Pocket-Asset-Revision')??manifest[url.pathname.slice(new URL(self.registration.scope).pathname.length)];
  let response=await cache.match(url.href);
  if(!revision||response?.headers.get('X-Pocket-Asset-Revision')!==revision||request.cache==='reload')response=null;
  if(!response) {
    const headers=new Headers(request.headers);headers.delete('Range');
    response=await fetch(new Request(request,{headers,cache:'no-cache'}));
    if(response.ok&&response.status===200&&revision) {
      const savedHeaders=new Headers(response.headers);savedHeaders.delete('Content-Encoding');savedHeaders.delete('Content-Length');savedHeaders.set('X-Pocket-Asset-Revision',revision);
      try {await cache.put(url.href,new Response(response.clone().body,{status:200,headers:savedHeaders}));}catch{}
    }
  }
  return request.headers.has('Range')&&response.status===200?rangeResponse(response,request.headers.get('Range')):response;
}
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url),scope=new URL(self.registration.scope);
  if(request.method!=='GET'||url.origin!==scope.origin)return;
  if(url.pathname.startsWith(`${scope.pathname}armageddon/`)) {
    event.respondWith(originalMedia(request,url).catch(()=>fetch(request)));return;
  }
  if(request.headers.has('Range'))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try {
      const response=await fetch(request);
      if(response.ok)try {await cache.put(request,response.clone());}catch{}
      return response;
    } catch {
      const cached=await cache.match(request);
      if(cached)return cached;
      if(request.mode==='navigate'&&url.pathname===scope.pathname)return await cache.match(scope.href)??Response.error();
      return Response.error();
    }
  })());
});
