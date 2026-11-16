// 숲 로그인 쿠키(원본, SameSite=Lax)를 멀티뷰 사이트 전용 분할 쿠키(SameSite=None; Secure; Partitioned)로 복사한다.
// 분할 쿠키는 "그 사이트가 최상위로 열렸을 때 안에 뜬 숲 iframe"에만 붙으므로 다른 사이트에는 노출되지 않는다.
// 시험판: 어떤 조합이 실제로 먹히는지 보려고 결과를 자세히 돌려준다. 쿠키 값은 절대 밖으로 내보내지 않는다.
//
// 서비스 워커는 30초쯤 쉬면 꺼지므로 상태는 전역 변수가 아니라 chrome.storage.session에 둔다.
// 리스너는 모두 최상위에서 동기적으로 등록한다(꺼졌다 켜질 때 이벤트를 다시 받으려면 필요하다).

importScripts('sites.js');

const TICKETS = ['AuthTicket', 'UserTicket', 'BbsTicket'];
// iframe 바로 아래 문맥에서 어느 값이 맞는지 아직 모르므로 둘 다 써 보고 결과를 기록한다.
// undefined는 hasCrossSiteAncestor를 모르는 구버전 크롬용이다.
const ANCESTOR_BITS = [true, false, undefined];
const SITES_KEY = 'topLevelSites';
const SOOP_DOMAIN = /(^|\.)sooplive\.(com|co\.kr)$/;

const isSoopCookie = c => SOOP_DOMAIN.test(c.domain.replace(/^\./, ''));
const cookieUrl = c => `https://${c.domain.replace(/^\./, '')}${c.path || '/'}`;
const errorText = error => String(error?.message || error);

const partitionKeyFor = (topLevelSite, hasCrossSiteAncestor) =>
  hasCrossSiteAncestor === undefined ? { topLevelSite } : { topLevelSite, hasCrossSiteAncestor };

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

async function readOriginals() {
  const found = await Promise.all(TICKETS.map(name => chrome.cookies.getAll({ name })));
  // partitionKey 없이 getAll하면 원본(비분할) 쿠키만 온다. 숲 도메인 것만 남긴다.
  return found.flat().filter(c => !c.partitionKey && isSoopCookie(c));
}

async function writeCopies(topLevelSite, originals) {
  const writes = [];
  for (const c of originals) {
    for (const bit of ANCESTOR_BITS) {
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

      const row = { name: c.name, domain: c.domain, hasCrossSiteAncestor: bit ?? 'unset' };
      try {
        const result = await chrome.cookies.set(details);
        writes.push({ ...row, ok: Boolean(result) });
      } catch (error) {
        writes.push({ ...row, ok: false, error: errorText(error) });
      }
    }
  }
  return writes;
}

async function listCopies(topLevelSite) {
  const seen = new Set();
  const copies = [];
  for (const bit of ANCESTOR_BITS) {
    let found = [];
    try {
      found = await chrome.cookies.getAll({ partitionKey: partitionKeyFor(topLevelSite, bit) });
    } catch {
      continue; // 이 크롬이 해당 분할 키 형식을 모르면 건너뛴다
    }
    for (const c of found) {
      if (!TICKETS.includes(c.name)) continue;
      const key = `${c.name}|${c.domain}|${JSON.stringify(c.partitionKey)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      copies.push(describe(c));
    }
  }
  return copies;
}

async function removeCopies(topLevelSite, name) {
  const copies = (await listCopies(topLevelSite)).filter(c => !name || c.name === name);
  for (const c of copies) {
    try {
      await chrome.cookies.remove({ url: cookieUrl(c), name: c.name, partitionKey: c.partitionKey });
    } catch (error) {
      console.warn('사본 삭제 실패', c.name, errorText(error));
    }
  }
  return copies.length;
}

async function knownSites() {
  const { [SITES_KEY]: sites = [] } = await chrome.storage.session.get(SITES_KEY);
  return sites;
}

async function rememberSite(topLevelSite) {
  const sites = await knownSites();
  if (!sites.includes(topLevelSite)) {
    await chrome.storage.session.set({ [SITES_KEY]: [...sites, topLevelSite] });
  }
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

async function handleMessage(message, sender) {
  // 콘텐츠 스크립트(bridge.js)가 허용된 최상위 페이지에서 보낸 요청만 받는다.
  const origin = sender.origin || (sender.url ? new URL(sender.url).origin : '');
  if (!origin || !isAllowedOrigin(origin) || sender.frameId !== 0) {
    return { ok: false, error: `허용되지 않은 출처: ${origin}` };
  }

  // 분할 키는 "사이트"(스킴+호스트) 단위라 포트를 뺀다. vercel.app은 공개 접미사라 호스트 전체가 한 사이트다.
  const { protocol, hostname } = new URL(origin);
  const topLevelSite = `${protocol}//${hostname}`;

  if (message?.type === 'sync') return sync(topLevelSite);
  if (message?.type === 'clear') return { ok: true, removed: await removeCopies(topLevelSite) };
  return { ok: false, error: 'unknown message' };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      sendResponse(await handleMessage(message, sender));
    } catch (error) {
      sendResponse({ ok: false, error: errorText(error) });
    }
  })();
  return true; // 비동기 응답을 기다리도록 채널을 열어 둔다
});

// 숲에서 다시 로그인하거나 로그아웃하면 사본도 따라간다.
// 타이머로 모으지 않고 쿠키 하나씩 처리한다(서비스 워커가 꺼지면 타이머도 사라진다).
chrome.cookies.onChanged.addListener(({ cookie, removed, cause }) => {
  if (!TICKETS.includes(cookie.name) || cookie.partitionKey || !isSoopCookie(cookie)) return;
  // 값이 바뀔 때는 'overwrite' 삭제 이벤트 뒤에 새 쿠키 추가 이벤트가 온다. 추가 쪽에서 덮어쓰면 된다.
  if (removed && cause === 'overwrite') return;

  (async () => {
    try {
      for (const site of await knownSites()) {
        if (removed) await removeCopies(site, cookie.name);
        else await writeCopies(site, [cookie]);
      }
    } catch (error) {
      console.error('사본 동기화 실패', errorText(error));
    }
  })();
});
