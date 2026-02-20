# soop-extension 대체 및 보안 취약점 해결 가이드

이 문서는 보안 취약점(`minimatch`, `ajv` 등)이 발견된 오래된 라이브러리 `soop-extension`을 제거하고, 필요한 기능을 직접 구현하여 프로젝트의 안정성을 높이는 방법을 설명합니다.

---

## 1. 대체 이유
- **보안 취약점**: `soop-extension`이 의존하는 구버전 `eslint` 및 `minimatch`에서 ReDoS(서비스 거부 공격) 취약점 발생.
- **유지보수 중단**: 해당 라이브러리의 업데이트가 멈춰 최신 보안 패치 적용 불가.
- **성능 최적화**: 필요한 핵심 API 호출 로직만 직접 구현하여 번들 크기 감소.

## 2. 단계별 전환 과정

### 1단계: 직접 구현 서비스 생성
`src/services/soopService.js` (또는 원하는 경로) 파일을 생성하고 아래 코드를 복사합니다.

```javascript
/**
 * SOOP(아프리카TV) 방송 상태 확인 서비스
 * @param {string} bjid - 방송인의 ID
 * @returns {Promise<Object>} 방송 상태 정보
 */
export const fetchLiveStatus = async (bjid) => {
  const url = `https://live.sooplive.co.kr/afreeca/player_live_api.php?bjid=${bjid}`;
  
  const body = new URLSearchParams({
    bid: bjid,
    type: 'live',
    pwd: '',
    player_type: 'html5',
    stream_type: 'common',
    quality: 'HD',
    mode: 'landing',
    from_api: '0',
    is_revive: 'false'
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: body.toString()
    });
    
    if (!response.ok) throw new Error('네트워크 응답 에러');
    
    const data = await response.json();
    
    return {
      isLive: data.CHANNEL && data.CHANNEL.RESULT === 1,
      title: data.CHANNEL?.TITLE || '',
      nickname: data.CHANNEL?.BJNICK || '',
      viewCount: data.CHANNEL?.VCNT || 0,
      thumbnail: data.CHANNEL?.THUMB || '',
      rawData: data
    };
  } catch (error) {
    console.error(`SOOP API 호출 에러 (${bjid}):`, error);
    return { isLive: false, error: error.message };
  }
};
```

### 2단계: 기존 코드 수정
`App.jsx`나 다른 컴포넌트에서 `soop-extension` 임포트 부분을 방금 만든 서비스로 교체합니다.

```javascript
// 수정 전
// import soop from 'soop-extension';

// 수정 후
import { fetchLiveStatus } from './services/soopService';

// 사용 예시
useEffect(() => {
  const checkStatus = async () => {
    const status = await fetchLiveStatus('bj_id_here');
    if (status.isLive) {
      setStreamData(status);
    }
  };
  checkStatus();
}, []);
```

### 3단계: 라이브러리 삭제 및 보안 확인
터미널에서 취약점이 포함된 라이브러리를 제거하고 보안 상태를 확인합니다.

```powershell
# 1. 라이브러리 삭제
npm uninstall soop-extension

# 2. 보안 취약점 재검사
npm audit
```

## 3. 기대 효과
- **취약점 해결**: `npm audit` 시 발견되었던 `minimatch` 및 `ajv` 관련 고위험군 경고가 사라집니다.
- **배포 안정성**: Vercel 배포 시 불필요한 의존성으로 인한 빌드 오류를 방지합니다.
- **코드 제어권**: API 요청 헤더나 파라미터를 직접 수정할 수 있어 향후 SOOP API 변경 시 빠른 대응이 가능합니다.
