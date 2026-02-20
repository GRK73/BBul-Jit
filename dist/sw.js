self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // 필수: 이 이벤트 리스너가 비어있더라도 존재해야 PWA로 인식됨
});
