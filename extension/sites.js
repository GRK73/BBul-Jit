// 쿠키 사본을 만들어 줄 최상위 사이트. 여기 맞지 않는 페이지의 요청은 모두 거절한다.
// 미리보기 주소는 끝에 팀 이름(grks-projects-0da57458)이 붙으므로 남의 vercel.app 프로젝트와 섞이지 않는다.
const ALLOWED_TOP_LEVEL = [
  /^https:\/\/planb-livecheck\.vercel\.app$/,
  /^https:\/\/planb-livecheck-[a-z0-9-]+-grks-projects-0da57458\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/
];

// eslint-disable-next-line no-unused-vars
const isAllowedOrigin = origin => ALLOWED_TOP_LEVEL.some(re => re.test(origin));
