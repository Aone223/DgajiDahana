/* Service worker DGaji — NETWORK-FIRST: selalu ambil versi terbaru,
   cache hanya dipakai saat offline. Ganti VERSI tiap update. */
var VERSI='dgaji-v14';
var ASSETS=['./','./index.html','./styles.css?v=14','./app.js?v=14','./logo-dark.png','./logo-light.png',
  './icon-192.png','./icon-512.png','./manifest.json'];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(VERSI).then(function(c){return c.addAll(ASSETS).catch(function(){});}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){if(k!==VERSI)return caches.delete(k);}));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  e.respondWith(
    fetch(req,{cache:'no-store'}).then(function(res){
      if(res&&res.status===200){
        var copy=res.clone();
        caches.open(VERSI).then(function(c){c.put(req,copy).catch(function(){});});
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        return hit||caches.match('./index.html');
      });
    })
  );
});
