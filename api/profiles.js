// /api/profiles — 닉네임, 프로필 이미지, 최근 다시보기처럼 잘 바뀌지 않는 값.
// 10분 캐시. 클라이언트도 최초 1회만 부르면 되므로 /api/status와 주기를 분리했다.

import { createRequire } from 'module';
import { isChzzkId } from '../lib/platform.js';

const require = createRequire(import.meta.url);
const streamers = require('../streamers.json');

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SOOP_HEADERS = {
  Origin: 'https://www.sooplive.co.kr',
  Referer: 'https://www.sooplive.co.kr/',
  'User-Agent': USER_AGENT
};

const CHZZK_HEADERS = { 'User-Agent': USER_AGENT };
const CHZZK_API = 'https://api.chzzk.naver.com';

const ALL_STREAMER_IDS = Object.values(streamers).flat();

const normalizeImageUrl = (url) => {
  if (!url) return '';
  return url.startsWith('//') ? `https:${url}` : url;
};

async function fetchWithTimeout(url, ms = 5000, headers = SOOP_HEADERS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(url, ms, headers) {
  const res = await fetchWithTimeout(url, ms, headers);
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
}

async function loadChzzkProfile(channelId) {
  const [channel, videos] = await Promise.all([
    getJson(`${CHZZK_API}/service/v1/channels/${channelId}`, 5000, CHZZK_HEADERS).catch(() => null),
    getJson(
      `${CHZZK_API}/service/v1/channels/${channelId}/videos?sortType=LATEST&pagingType=PAGE&page=0&size=1`,
      5000,
      CHZZK_HEADERS
    ).catch(() => null)
  ]);

  const latest = videos?.content?.data?.[0];

  return {
    id: channelId,
    nick: channel?.content?.channelName || channelId,
    thumb: channel?.content?.channelImageUrl || '',
    replay: latest?.videoNo
      ? {
          titleNo: latest.videoNo,
          title: latest.videoTitle || 'Recent VOD',
          thumb: latest.thumbnailImageUrl || '',
          url: `https://chzzk.naver.com/video/${latest.videoNo}`
        }
      : null
  };
}

async function loadProfile(bjid) {
  if (isChzzkId(bjid)) return loadChzzkProfile(bjid);

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
