// /api/status — 라이브 여부만 빠르게 확인한다. 30초 캐시.
// 프로필/다시보기처럼 잘 안 바뀌는 값은 /api/profiles가 따로 담당한다.
// 이렇게 나눠야 이 함수가 Hobby 플랜의 10초 타임아웃 안에서 안정적으로 끝난다.

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const streamers = require('../streamers.json');

const SOOP_HEADERS = {
  Origin: 'https://www.sooplive.co.kr',
  Referer: 'https://www.sooplive.co.kr/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

const ALL_STREAMER_IDS = Object.values(streamers).flat();
const CATEGORY_BY_ID = Object.entries(streamers).reduce((acc, [category, ids]) => {
  ids.forEach((id) => {
    acc[id] = category;
  });
  return acc;
}, {});

async function fetchWithTimeout(url, options = {}, ms = 4000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function checkOne(bjid) {
  const base = {
    id: bjid,
    categoryKey: CATEGORY_BY_ID[bjid] || 'Others',
    isLive: false,
    title: '',
    viewer: 'OFFLINE',
    duration: 0,
    broadNo: null
  };

  try {
    const res = await fetchWithTimeout(
      `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${bjid}`,
      {
        method: 'POST',
        headers: { ...SOOP_HEADERS, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ bid: bjid, type: 'live', player_type: 'html5' })
      },
      4000
    );
    if (!res.ok) return base;

    const data = await res.json();
    const ch = data?.CHANNEL;
    if (ch?.RESULT !== 1) return base;

    return {
      ...base,
      isLive: true,
      nick: ch.BJNICK,
      title: ch.TITLE,
      duration: ch.BTIME || 0,
      broadNo: ch.BNO,
      viewer: 'LIVE',
      thumb: `https://liveimg.sooplive.co.kr/m/${ch.BNO}`
    };
  } catch {
    return base;
  }
}

// 동접 수는 라이브 중인 사람만 조회한다. 보통 0~3명이라 호출 부담이 거의 없다.
async function fillViewerCounts(list) {
  await Promise.all(
    list
      .filter((s) => s.isLive)
      .map(async (s) => {
        try {
          const res = await fetchWithTimeout(
            `https://chapi.sooplive.co.kr/api/${s.id}/station`,
            { headers: SOOP_HEADERS },
            4000
          );
          if (!res.ok) return;
          const data = await res.json();
          if (data?.broad?.visitor_cnt != null) s.viewer = data.broad.visitor_cnt;
        } catch {
          /* 동접 수는 없어도 화면이 뜨므로 조용히 넘어간다 */
        }
      })
  );
}

export default async function handler(req, res) {
  try {
    const list = await Promise.all(ALL_STREAMER_IDS.map(checkOne));
    await fillViewerCounts(list);

    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=300');
    res.status(200).json({ updatedAt: Date.now(), streamers: list });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ error: 'failed to collect status' });
  }
}
