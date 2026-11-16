# Chrome Web Store Listing — PLAN.B 멀티뷰 로그인 도우미

> Last Updated: 2026-11-16
>
> 지금은 0단계 시험판이다. 시험이 끝나면 이름에서 "(시험판)"을 빼고, 미리보기·localhost 주소를 manifest에서 지운 뒤 이 문서를 다시 맞춘다.
> 확장 소스는 `extension/` 폴더다. 스토어용 ZIP은 `extension/` 안의 파일만 묶는다(이 문서는 넣지 않는다).

## Store Listing

**Extension Name** [REQUIRED]
PLAN.B 멀티뷰 로그인 도우미

**Short Description** [REQUIRED]
PLAN.B 멀티뷰 페이지에서 여러 숲(SOOP) 방송을 볼 때, 각 플레이어에서도 내 숲 계정으로 로그인된 상태로 볼 수 있게 해 줍니다.

**Detailed Description** [REQUIRED]
PLAN.B 멀티뷰 페이지(planb-livecheck.vercel.app)에 띄운 숲 플레이어들이 내 숲 계정으로 로그인된 상태로 열리게 해 줍니다.

멀티뷰 페이지에서 여러 방송을 한 화면에 띄우면, 브라우저 보안 규칙 때문에 각 플레이어가 비로그인 상태로 열립니다. 이 확장을 설치하면 이미 숲에 로그인한 상태가 멀티뷰 페이지 안의 플레이어에도 이어집니다.
로그인 상태는 PLAN.B 멀티뷰 페이지 안에서만 쓰이고, 다른 사이트에는 전달되지 않습니다.
숲에서 로그아웃하면 멀티뷰 페이지의 로그인 상태도 바로 해제됩니다.

사용 방법
1. 숲(sooplive.com)에 평소처럼 로그인합니다.
2. PLAN.B 멀티뷰 페이지를 엽니다.
3. 플레이어가 로그인된 상태로 열립니다.

개인정보
이 확장은 어떤 정보도 외부로 보내지 않습니다. 숲 로그인 정보는 내 브라우저 안에서만 멀티뷰 페이지용으로 복사되며, 확장 개발자를 포함해 누구에게도 전송되지 않습니다.

**Category** [REQUIRED]
Social & Communication

**Single Purpose** [REQUIRED]
PLAN.B 멀티뷰 페이지 안의 숲 플레이어가 사용자의 숲 로그인 상태를 쓸 수 있게 한다.

**Primary Language** [REQUIRED]
Korean

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 [REQUIRED] | 1280×800 or 640×400 | ⬜ Not created | |
| Screenshot 2 [RECOMMENDED] | 1280×800 or 640×400 | ⬜ Not created | |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

### Screenshot Notes
1. 멀티뷰 페이지에 숲 방송 4개가 로그인 상태(프로필·채팅 입력창 보임)로 떠 있는 화면
2. 확장이 없을 때(비로그인)와 있을 때(로그인)를 나란히 비교한 화면

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| cookies | permissions | 사용자가 숲에 로그인할 때 받은 로그인 쿠키 3개(AuthTicket, UserTicket, BbsTicket)를 읽어, PLAN.B 멀티뷰 페이지 안에서만 쓰이는 복사본을 만들고, 숲에서 로그아웃하면 그 복사본을 지우는 데 사용합니다. |
| storage | permissions | 복사본을 만들어 준 멀티뷰 페이지 주소를 브라우저 세션 동안만 기억해, 숲 로그인 상태가 바뀌면 그 페이지의 복사본도 함께 갱신하는 데 사용합니다. 브라우저를 닫으면 지워집니다. |
| https://*.sooplive.com/* | host_permissions | 숲(SOOP)의 로그인 쿠키를 읽고, 멀티뷰 페이지용 복사본을 쓰고 지우려면 숲 도메인에 대한 쿠키 접근이 필요합니다. 숲 페이지 내용은 읽거나 바꾸지 않습니다. |
| https://*.sooplive.co.kr/* | host_permissions | 숲의 예전 도메인입니다. 일부 로그인 쿠키가 아직 이 도메인에 있을 수 있어 위와 같은 목적으로 필요합니다. |
| https://planb-livecheck.vercel.app/* | content_scripts | PLAN.B 멀티뷰 페이지에 확장이 설치돼 있는지와 숲 로그인 여부(예/아니오)만 알려 주는 작은 스크립트를 넣습니다. 이 페이지 외의 사이트에서는 실행되지 않습니다. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** Yes (브라우저 안에서만 처리, 외부 전송 없음)

| Data Type | Collected? | Transmitted Off-Device? | Purpose | Shared with Third Parties? |
|-----------|-----------|------------------------|---------|---------------------------|
| Personally identifiable info | No | No | | No |
| Health info | No | No | | No |
| Financial info | No | No | | No |
| Authentication info | Yes | No | 숲 로그인 쿠키를 같은 브라우저 안에서 멀티뷰 페이지용으로 복사 | No |
| Personal communications | No | No | | No |
| Location | No | No | | No |
| Web history | No | No | | No |
| User activity | No | No | | No |
| Website content | No | No | | No |

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Privacy Policy

**Privacy Policy URL** [REQUIRED]
미정 — 스토어 제출 전에 사이트에 개인정보처리방침 페이지를 만들어 주소를 적는다.

## Distribution

**Visibility**: Unlisted (링크를 아는 사람만)
**Regions**: All regions

## Developer Info

**Publisher Name** [REQUIRED]
미정

**Contact Email** [REQUIRED]
미정

**Support URL / Email** [RECOMMENDED]
https://github.com/GRK73/BBul-Jit/issues

**Homepage URL** [RECOMMENDED]
https://planb-livecheck.vercel.app/

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.0.2 | 2026-11-16 | Chrome 확장 가이드(modern-web-guidance의 chrome-extensions 스킬)에 맞춰 정리: 콘텐츠 스크립트를 정확한 주소로 제한, 서비스 워커 타이머·전역 상태 제거, async/await로 통일 | Draft |
| 0.0.1 | 2026-11-16 | 0단계 시험판: 로그인 쿠키를 멀티뷰 전용 분할 쿠키로 복사 | Draft |

## Review Notes

### Known Issues / Limitations
- 시험판 manifest에는 Vercel 미리보기 주소와 localhost가 들어 있다. 스토어 제출 전에 반드시 지운다.
- 숲이 임베드 플레이어에서 로그인 기능 자체를 막아 두었다면 이 확장으로는 해결되지 않는다(0단계 시험에서 확인 중).
- 심사에서 "로그인 쿠키를 다룬다"는 점을 자세히 볼 수 있다. 쿠키 값이 브라우저 밖으로 나가지 않는다는 점과, 복사본이 멀티뷰 페이지 안에서만 쓰인다는 점을 설명에 분명히 적는다.

### Rejection History
없음
