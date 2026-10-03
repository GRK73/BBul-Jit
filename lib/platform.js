// 서버(/api)와 화면(src)이 같이 쓰는 플랫폼 판별.
// 숲 아이디는 20자 이하, 치지직 채널 ID는 32자리 16진수라 streamers.json에 그대로 섞어 적어도 구분된다.

const CHZZK_ID = /^[0-9a-f]{32}$/;
const SOOP_ID = /^[a-z0-9_]{3,20}$/i;

export const isChzzkId = id => CHZZK_ID.test(id);
export const isValidStreamerId = id => CHZZK_ID.test(id) || SOOP_ID.test(id);

export const liveUrl = id =>
  isChzzkId(id) ? `https://chzzk.naver.com/live/${id}` : `https://play.sooplive.co.kr/${id}`;

export const channelUrl = id =>
  isChzzkId(id) ? `https://chzzk.naver.com/${id}` : `https://www.sooplive.co.kr/station/${id}`;
