// 멀티뷰 로그인 도우미 확장(extension/)과 대화한다.
// 확장의 bridge.js가 같은 창에서 window.postMessage로 받아 준다. 쿠키 값은 오가지 않는다.

const PAGE = 'planb-mv-page';
const EXT = 'planb-mv-ext';

export function createExtensionBridge() {
  const waiters = new Map();
  let version = null;
  let readyResolvers = [];

  window.addEventListener('message', event => {
    if (event.source !== window || event.origin !== location.origin) return;
    const data = event.data;
    if (!data || data.source !== EXT) return;
    if (data.type === 'ready') {
      version = data.version;
      readyResolvers.splice(0).forEach(resolve => resolve(true));
    }
    const resolve = waiters.get(data.type);
    if (resolve) {
      waiters.delete(data.type);
      resolve(data.report);
    }
  });

  const post = type => window.postMessage({ source: PAGE, type }, location.origin);

  // 확장이 있으면 bridge.js가 곧바로 답한다. 처음 알림은 놓칠 수 있어 ping을 몇 번 보낸다.
  const detect = (timeout = 1500) => {
    if (version) return Promise.resolve(true);
    return new Promise(resolve => {
      readyResolvers.push(resolve);
      const started = Date.now();
      const tick = () => {
        if (version) return;
        if (Date.now() - started > timeout) {
          readyResolvers = readyResolvers.filter(r => r !== resolve);
          resolve(false);
          return;
        }
        post('ping');
        setTimeout(tick, 100);
      };
      tick();
    });
  };

  const request = (type, timeout = 6000) =>
    new Promise(resolve => {
      const key = `${type}-result`;
      waiters.set(key, resolve);
      post(type);
      setTimeout(() => {
        if (waiters.get(key) === resolve) {
          waiters.delete(key);
          resolve(null);
        }
      }, timeout);
    });

  return {
    detect,
    sync: () => request('sync'),
    get version() {
      return version;
    }
  };
}

// 확장 응답을 화면에 보일 상태 하나로 줄인다.
export function loginStateFromReport(detected, report) {
  if (!detected) return 'none';
  if (!report?.ok) return 'error';
  if (!report.loggedIn) return 'loggedOut';
  return report.copies?.length ? 'ready' : 'error';
}
