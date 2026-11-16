// 쿠키 사본을 만들어 줄 최상위 사이트. 여기 맞지 않는 페이지의 요청은 모두 거절한다.
// 미리보기 주소는 패턴으로 열지 않고 정확한 주소만 적는다.
// (vercel.app 주소는 누구나 프로젝트 이름으로 비슷하게 만들 수 있어서 패턴은 위험하다.)
const ALLOWED_TOP_LEVEL = [
  /^https:\/\/planb-livecheck\.vercel\.app$/,
  // keen-gauss-8bjip4 브랜치 미리보기. 이 주소는 브랜치의 최신 배포를 항상 가리켜서 푸시해도 바뀌지 않는다.
  /^https:\/\/b-bul-jit-git-claude-keen-gauss-8bjip4-grks-projects-0da57458\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/
];

// eslint-disable-next-line no-unused-vars
const isAllowedOrigin = origin => ALLOWED_TOP_LEVEL.some(re => re.test(origin));
