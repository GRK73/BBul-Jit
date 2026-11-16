// 페이지 ↔ 확장 다리. 허용된 멀티뷰 페이지에서만 동작하고, 그 외 vercel.app 페이지에서는 아무것도 하지 않는다.
// 페이지에는 쿠키 값이 아니라 속성(이름·도메인·SameSite 등)과 결과만 넘긴다.
(() => {
  // isAllowedOrigin은 sites.js에 있다 (manifest에서 먼저 불러온다).
  if (!isAllowedOrigin(location.origin)) return;

  const reply = message => window.postMessage({ source: 'planb-mv-ext', ...message }, location.origin);

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'planb-mv-page') return;

    // 처음 보내는 ready는 페이지 스크립트보다 먼저 나가 놓칠 수 있으므로, 페이지가 ping하면 다시 알려 준다.
    if (data.type === 'ping') {
      reply({ type: 'ready', version: chrome.runtime.getManifest().version });
      return;
    }

    if (data.type === 'sync' || data.type === 'clear') {
      chrome.runtime.sendMessage({ type: data.type }, report => {
        const error = chrome.runtime.lastError?.message;
        reply({ type: `${data.type}-result`, report: error ? { ok: false, error } : report });
      });
    }
  });

  reply({ type: 'ready', version: chrome.runtime.getManifest().version });
})();
