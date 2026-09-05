// /api/profiles — 닉네임, 프로필 이미지, 최근 다시보기처럼 잘 바뀌지 않는 값.
// 10분 캐시. 클라이언트도 최초 1회만 부르면 되므로 /api/status와 주기를 분리했다.

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

const normalizeImageUrl = (url) => {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
};

async function fetchWithTimeout(url, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers: SOOP_HEADERS, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, ms) {
  const res = await fetchWithTimeout(url, ms);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function loadProfile(bjid) {
  const [station, vods] = await Promise.all([
    getJson(`https://chapi.sooplive.co.kr/api/${bjid}/station`, 5000).catch(() => null),
    getJson(`https://chapi.sooplive.co.kr/api/${bjid}/vods?page=1`, 5000).catch(() => null)
  ]);

  const latest = vods?.data?.[0];

  return {
    id: bjid,
    nick: station?.station?.user_nick || bjid,
    thumb: normalizeImageUrl(station?.profile_image),
    replay: latest?.title_no
      ? {
          titleNo: latest.title_no,
          title: latest.title_name || 'Recent VOD',
          thumb: normalizeImageUrl(latest.ucc?.thumb),
          url: `https://vod.sooplive.co.kr/player/${latest.title_no}`
        }
      : null
  };
}

export default async function handler(req, res) {
  try {
    const list = await Promise.all(ALL_STREAMER_IDS.map(loadProfile));

    const byId = {};
    for (const p of list) byId[p.id] = p;

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
    res.status(200).json({ updatedAt: Date.now(), profiles: byId });
  } catch {
    res.setHeader('Cache-Control', 'no-store');
    res.status(500).json({ error: 'failed to load profiles' });
  }
}
