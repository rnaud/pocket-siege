import {createHash} from 'node:crypto';
import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';

// Content revisions keep unchanged original media cached across code releases.
export function assetManifestPlugin() {
  let root,outDir,cached,isBuild;
  const manifest=()=>{
    if(cached)return cached;
    const assets={};
    function walk(dir) {
      for(const entry of readdirSync(dir,{withFileTypes:true})) {
        const path=resolve(dir,entry.name);
        if(entry.isDirectory())walk(path);
        else assets[relative(resolve(root,'public'),path).split('\\').join('/')]=createHash('sha256').update(readFileSync(path)).digest('hex');
      }
    }
    walk(resolve(root,'public/armageddon'));
    const body=JSON.stringify({assets});
    return cached={body,revision:createHash('sha256').update(body).digest('hex')};
  };
  return {
    name:'original-asset-manifest',
    configResolved(config){root=config.root;isBuild=config.command==='build';outDir=resolve(root,config.build.outDir);},
    configureServer(server){
      server.watcher.on('all',(_,path)=>{if(path.includes('/public/armageddon/'))cached=undefined;});
      server.middlewares.use((req,res,next)=>{
        if(req.url?.split('?')[0].endsWith('/asset-manifest.json')) {
          res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-cache');res.end(manifest().body);
        } else next();
      });
    },
    generateBundle(){this.emitFile({type:'asset',fileName:'asset-manifest.json',source:manifest().body});},
    closeBundle(){
      if(!isBuild)return;
      const path=resolve(outDir,'sw.js');
      writeFileSync(path,readFileSync(path,'utf8').replace('__ASSET_MANIFEST_REVISION__',manifest().revision));
    },
  };
}
