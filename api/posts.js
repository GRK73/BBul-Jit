// /api/posts?id={bjid} — 오프라인 카드에 띄우는 최근 게시글
// 게시판 메뉴 수만큼 브라우저가 부르던 것을 서버 1회 호출로 대체한다.
// 게시글은 자주 바뀌지 않으므로 상태보다 캐시를 길게 잡는다.

const SOOP_HEADERS = {
  Origin: 'https://www.sooplive.co.kr',
  Referer: 'https://www.sooplive.co.kr/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

async function fetchWithTimeout(url, options = {}, ms = 6000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, ms) {
  const res = await fetchWithTimeout(url, { headers: SOOP_HEADERS }, ms);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

export default async function handler(req, res) {
  const bjid = String(req.query.id || '').trim();

  // 임의의 값으로 외부 API를 대신 때리는 오픈 프록시가 되지 않도록 형식을 제한한다.
  if (!/^[a-z0-9_]{3,20}$/i.test(bjid)) {
    res.setHeader('Cache-Control', 'no-store');
    return res.status(400).json({ error: 'invalid id' });
  }

  try {
    const station = await getJson(`https://chapi.sooplive.co.kr/api/${bjid}/station`, 5000);
    const menus = (station?.station?.menus || []).filter(
      (menu) => Number(menu.display_type) === 104 && menu.bbs_no
    );

    const boards = await Promise.all(
      menus.map((menu) =>
        getJson(
          `https://api-channel.sooplive.co.kr/v1.1/channel/${bjid}/board` +
            `?bbsNo=${menu.bbs_no}&page=1&perPage=20`,
          6000
        ).catch(() => null)
      )
    );

    const seen = new Set();
    const posts = [];

    for (const board of boards) {
      for (const post of board?.contents || board?.data || []) {
        // 본인 글만, 중복 없이
        if (post.userId !== bjid || seen.has(post.titleNo)) continue;
        seen.add(post.titleNo);
        posts.push({
          titleNo: post.titleNo,
          title: post.titleName || '제목 없음',
          regDate: post.regDate || '',
          url: `https://www.sooplive.co.kr/station/${bjid}/post/${post.titleNo}`
        });
      }
    }

    posts.sort((a, b) => String(b.regDate).localeCompare(String(a.regDate)));

    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    res.status(200).json({ id: bjid, posts: posts.slice(0, 20) });
  } catch {
    res.setHeader('Cache-Control', 'public, s-maxage=60');
    res.status(200).json({ id: bjid, posts: [], failed: true });
  }
}
