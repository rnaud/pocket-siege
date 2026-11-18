const CACHE='pocket-siege-media-v1';
const base=new URL(import.meta.env?.BASE_URL??'/',globalThis.location?.href??'http://localhost/');
const pending=new Map(),completed=new Set(),listeners=new Set();
let cachedFiles=0,manifestPromise;
async function cacheStore(){try{return await globalThis.caches?.open(CACHE)??null;}catch{return null;}}
async function manifest() {
  if(!manifestPromise)manifestPromise=(async()=>{
    const cache=await cacheStore(),url=new URL('asset-manifest.json',base).href;
    try {
      const response=await globalThis.fetch(url,{cache:'no-cache'});
      if(!response.ok)throw new Error('Asset manifest unavailable');
      const data=await response.clone().json();
      if(!data.assets)throw new Error('Invalid asset manifest');
      try {await cache?.put(url,response);}catch{/* Storage can be unavailable or full. */}
      return data.assets;
    } catch {try{return (await cache?.match(url))?.json().then(data=>data.assets).catch(()=>null)??null;}catch{return null;}}
  })();
  return manifestPromise;
}
export function observeAssetCache(listener) {
  listeners.add(listener);listener({files:completed.size,cachedFiles});
  return ()=>listeners.delete(listener);
}
export async function fetchGameAsset(input,options={}) {
  const url=new URL(input,base).href;
  if(!pending.has(url))pending.set(url,(async()=>{
    const cache=await cacheStore(),versions=await manifest();
    const revision=versions?.[new URL(url).pathname.slice(base.pathname.length)];
    let response,fromCache=false;
    if(revision&&options.cache!=='reload') {
      try {response=await cache?.match(url);}catch{}
      if(response?.headers.get('X-Pocket-Asset-Revision')!==revision)response=null;
      fromCache=!!response;
    }
    if(!response) {
      const headers=new Headers(options.headers);
      if(revision)headers.set('X-Pocket-Asset-Revision',revision);
      response=await globalThis.fetch(url,{...options,headers,cache:options.cache??(revision?'no-cache':'default')});
      if(response.ok&&revision) {
        const headers=new Headers(response.headers);headers.delete('Content-Encoding');headers.delete('Content-Length');headers.set('X-Pocket-Asset-Revision',revision);
        try {await cache?.put(url,new Response(response.clone().body,{status:response.status,statusText:response.statusText,headers}));}catch{}
      }
    }
    if(response.ok&&!completed.has(url)) {
      completed.add(url);if(fromCache)cachedFiles++;
      for(const listener of listeners)listener({files:completed.size,cachedFiles});
    }
    return response;
  })());
  const request=pending.get(url);
  try {return (await request).clone();}finally{if(pending.get(url)===request)pending.delete(url);}
}
