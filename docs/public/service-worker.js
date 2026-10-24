const CACHE = "tradetalk-vitepress-v2.2.0-qa2";
const PHONEME_ASSETS = ["aa","ae","aw","b","ch","d","e","er","eth","f","g","h","i","ih","j","k","l","m","n","ng","o","p","r","s","schwa","sh","t","theta","u","uh","uh-short","v","w","y","z","zh"].map(name => `./audio/phonemes/${name}.ogg`);
const ASSETS = ["./","./index.html","./tradetalk-shell.html","./styles.css","./content.js","./v1-1-data.js","./phonetics-data.js","./content/industry.json","./content/scenarios.json","./content/qa-units.json","./vendor/easy-speech/EasySpeech.iife.js","./vendor/easy-speech/LICENSE","./app.js","./manifest.json","./icon.svg","./templates/learning-material-template.md","./templates/qa-unit-template.json",...PHONEME_ASSETS];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (new URL(event.request.url).pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(event.request, copy)); return response;
  }).catch(() => caches.match("./index.html"))));
});
