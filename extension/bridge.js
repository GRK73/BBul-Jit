// 페이지 ↔ 확장 다리. manifest에서 멀티뷰 페이지 주소에만 주입되고, 여기서 한 번 더 주소를 확인한다.
// 페이지에는 쿠키 값이 아니라 속성(이름·도메인·SameSite 등)과 결과만 넘긴다.
(() => {
  // isAllowedOrigin은 sites.js에 있다 (manifest에서 먼저 불러온다).
  if (!isAllowedOrigin(location.origin)) return;

  const reply = message => window.postMessage({ source: 'planb-mv-ext', ...message }, location.origin);
  const announce = () => reply({ type: 'ready', version: chrome.runtime.getManifest().version });

  window.addEventListener('message', async event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== 'planb-mv-page') return;

    // 처음 보내는 ready는 페이지 스크립트보다 먼저 나가 놓칠 수 있으므로, 페이지가 ping하면 다시 알려 준다.
    if (data.type === 'ping') {
      announce();
      return;
    }

    if (data.type === 'sync' || data.type === 'clear') {
      let report;
      try {
        report = await chrome.runtime.sendMessage({ type: data.type });
      } catch (error) {
        // 확장을 새로고침한 뒤 페이지를 그대로 두면 여기로 온다. 페이지를 새로고침하면 된다.
        report = { ok: false, error: String(error?.message || error) };
      }
      reply({ type: `${data.type}-result`, report });
    }
  });

  announce();
})();
