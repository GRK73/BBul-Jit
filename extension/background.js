// 숲 로그인 쿠키(원본, SameSite=Lax)를 멀티뷰 사이트 전용 분할 쿠키(SameSite=None; Secure; Partitioned)로 복사한다.
// 분할 쿠키는 "그 사이트가 최상위로 열렸을 때 안에 뜬 숲 iframe"에만 붙으므로 다른 사이트에는 노출되지 않는다.
// 시험판: 어떤 조합이 실제로 먹히는지 보려고 결과를 자세히 돌려준다. 쿠키 값은 절대 밖으로 내보내지 않는다.

importScripts('sites.js');

const TICKETS = ['AuthTicket', 'UserTicket', 'BbsTicket'];
// iframe 바로 아래 문맥에서 어느 값이 맞는지 아직 모르므로 둘 다 써 보고 결과를 기록한다.
const ANCESTOR_BITS = [true, false];
const SITES_KEY = 'topLevelSites';

const describe = c => ({
  name: c.name,
  domain: c.domain,
  hostOnly: c.hostOnly,
  path: c.path,
  httpOnly: c.httpOnly,
  secure: c.secure,
  sameSite: c.sameSite,
  session: c.session,
  partitionKey: c.partitionKey || null
});

const cookieUrl = c => `https://${c.domain.replace(/^\./, '')}${c.path || '/'}`;

async function readOriginals() {
  const found = await Promise.all(TICKETS.map(name => chrome.cookies.getAll({ name })));
  // partitionKey 없이 getAll하면 원본(비분할) 쿠키만 온다. 숲 도메인 것만 남긴다.
  return found.flat().filter(c => !c.partitionKey && /(^|\.)sooplive\.(com|co\.kr)$/.test(c.domain.replace(/^\./, '')));
}

const partitionKeyFor = (topLevelSite, hasCrossSiteAncestor) =>
  hasCrossSiteAncestor === undefined ? { topLevelSite } : { topLevelSite, hasCrossSiteAncestor };

async function writeCopies(topLevelSite, originals) {
  const writes = [];
  for (const c of originals) {
    // 구버전 크롬은 hasCrossSiteAncestor를 모르므로 마지막에 필드 없이도 시도한다.
    for (const bit of [...ANCESTOR_BITS, undefined]) {
      const details = {
        url: cookieUrl(c),
        name: c.name,
        value: c.value,
        path: c.path,
        secure: true,
        httpOnly: c.httpOnly,
        sameSite: 'no_restriction',
        partitionKey: partitionKeyFor(topLevelSite, bit)
      };
      if (!c.hostOnly) details.domain = c.domain;
      // 원본이 세션 쿠키면 만료일을 넣지 않아 사본도 세션 쿠키로 둔다.
      if (!c.session && c.expirationDate) details.expirationDate = c.expirationDate;

      try {
        const result = await chrome.cookies.set(details);
        writes.push({ name: c.name, domain: c.domain, hasCrossSiteAncestor: bit ?? 'unset', ok: !!result });
      } catch (error) {
        writes.push({ name: c.name, domain: c.domain, hasCrossSiteAncestor: bit ?? 'unset', ok: false, error: String(error?.message || error) });
      }
    }
  }
  return writes;
}

async function listCopies(topLevelSite) {
  const lists = await Promise.all(
    [...ANCESTOR_BITS, undefined].map(bit =>
      chrome.cookies.getAll({ partitionKey: partitionKeyFor(topLevelSite, bit) }).catch(() => [])
    )
  );
  const seen = new Set();
  return lists
    .flat()
    .filter(c => TICKETS.includes(c.name))
    .filter(c => {
      const key = `${c.name}|${c.domain}|${JSON.stringify(c.partitionKey)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(describe);
}

async function removeCopies(topLevelSite) {
  const copies = await listCopies(topLevelSite);
  await Promise.all(
    copies.map(c =>
      chrome.cookies
        .remove({ url: cookieUrl(c), name: c.name, partitionKey: c.partitionKey })
        .catch(() => null)
    )
  );
  return copies.length;
}

async function rememberSite(topLevelSite) {
  const { [SITES_KEY]: sites = [] } = await chrome.storage.session.get(SITES_KEY);
  if (!sites.includes(topLevelSite)) {
    await chrome.storage.session.set({ [SITES_KEY]: [...sites, topLevelSite] });
  }
}

async function knownSites() {
  const { [SITES_KEY]: sites = [] } = await chrome.storage.session.get(SITES_KEY);
  return sites;
}

async function sync(topLevelSite) {
  const originals = await readOriginals();
  await removeCopies(topLevelSite);
  const writes = originals.length ? await writeCopies(topLevelSite, originals) : [];
  await rememberSite(topLevelSite);
  return {
    ok: true,
    topLevelSite,
    browser: navigator.userAgent,
    loggedIn: TICKETS.every(name => originals.some(c => c.name === name)),
    originals: originals.map(describe),
    writes,
    copies: await listCopies(topLevelSite)
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 콘텐츠 스크립트(bridge.js)가 허용된 최상위 페이지에서 보낸 요청만 받는다.
  const origin = sender.origin || (sender.url && new URL(sender.url).origin);
  if (!origin || !isAllowedOrigin(origin) || sender.frameId !== 0) {
    sendResponse({ ok: false, error: `허용되지 않은 출처: ${origin}` });
    return false;
  }

  // 분할 키는 "사이트"(스킴+호스트) 단위라 포트를 뺀다. vercel.app은 공개 접미사라 호스트 전체가 한 사이트다.
  const { protocol, hostname } = new URL(origin);
  const topLevelSite = `${protocol}//${hostname}`;

  const task =
    message?.type === 'sync'
      ? sync(topLevelSite)
      : message?.type === 'clear'
        ? removeCopies(topLevelSite).then(removed => ({ ok: true, removed }))
        : Promise.resolve({ ok: false, error: 'unknown message' });

  task.then(sendResponse, error => sendResponse({ ok: false, error: String(error?.message || error) }));
  return true; // 비동기 응답
});

// 숲에서 다시 로그인하거나 로그아웃하면 사본도 따라간다.
let resyncTimer = null;
chrome.cookies.onChanged.addListener(({ cookie }) => {
  if (!TICKETS.includes(cookie.name) || cookie.partitionKey) return;
  clearTimeout(resyncTimer);
  // 로그인·로그아웃 때 세 쿠키가 연달아 바뀌므로 잠깐 모았다가 한 번에 처리한다.
  resyncTimer = setTimeout(async () => {
    for (const site of await knownSites()) {
      const originals = await readOriginals();
      await removeCopies(site);
      if (originals.length) await writeCopies(site, originals);
    }
  }, 300);
});
