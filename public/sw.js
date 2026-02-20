self.addEventListener('install', (e) => {
  console.log('[Service Worker] Install');
});

self.addEventListener('fetch', (e) => {
  // 앱 설치를 위해 필요한 최소한의 fetch 이벤트 리스너
});
