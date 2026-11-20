const CACHE='date-invite-v1';
const FILES=['/','/index.html','/manifest.json','/icon.png','/icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin||new URL(event.request.url).pathname.startsWith('/api/'))return;
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy))}return response}).catch(()=>caches.match(event.request).then(response=>response||caches.match('/index.html'))));
});
self.addEventListener('push',event=>{
  let data={};try{data=event.data?event.data.json():{}}catch{}
  const title=data.title||'Новое приглашение 💌';
  event.waitUntil(self.registration.showNotification(title,{body:data.body||'Выбрали дату и занятие!',icon:'/icon.png',badge:'/icon.png',tag:'date-invite-selection',renotify:true,data:{url:data.url||'/'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();const target=new URL(event.notification.data?.url||'/',self.location.origin).href;
  event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(clients=>{const existing=clients.find(client=>client.url===target);return existing?existing.focus():self.clients.openWindow(target)}));
});
