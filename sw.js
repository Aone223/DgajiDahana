/* Service worker DGaji — cache app shell untuk offline + installable */
var CACHE='dgaji-v4';
var ASSETS=['./','./index.html','./styles.css','./app.js','./logo.png','./icon-192.png','./icon-512.png','./manifest.json'];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS).catch(function(){});}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  // SheetJS dari CDN: network dulu, fallback cache
  e.respondWith(
    caches.match(e.request).then(function(hit){
      var net=fetch(e.request).then(function(res){
        if(res&&res.status===200&&e.request.url.indexOf('http')===0){
          var copy=res.clone();caches.open(CACHE).then(function(c){c.put(e.request,copy).catch(function(){});});
        }
        return res;
      }).catch(function(){return hit;});
      return hit||net;
    })
  );
});
