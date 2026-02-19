const { execSync } = require('child_process');

function fetchMobileTitles() {
    const cafeName = 'planbb1f';
    const menuId = '11';
    // 모바일 버전 게시판 목록
    const url = `https://m.cafe.naver.com/ArticleList.nhn?search.clubid=31670224&search.menuid=${menuId}`;
    
    console.log(`[Target] Naver Mobile HTML: ${url}`);

    try {
        const command = `$ProgressPreference = 'SilentlyContinue'; (Invoke-WebRequest -UseBasicParsing -Uri "${url}" -UserAgent "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1").Content`;
        const html = execSync(command, { shell: 'powershell.exe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });

        console.log(" - HTML 수집 완료. 분석 중...");

        // 모바일 버전 제목 패턴: <strong class="tit">제목</strong>
        const titles = [];
        const regex = /<strong class="tit">([\s\S]*?)<\/strong>/g;
        let match;
        while ((match = regex.exec(html)) !== null) {
            let title = match[1].trim()
                .replace(/<[^>]+>/g, '') // 태그 제거
                .replace(/\s+/g, ' ');
            if (title.length > 2 && !title.includes('네이버 카페')) {
                titles.push(title);
            }
        }

        if (titles.length > 0) {
            console.log(`\n✅ 성공! ${titles.length}개의 제목을 찾았습니다.\n`);
            titles.forEach((t, i) => console.log(` ${i+1}. ${t}`));
            return true;
        } else {
            console.log("모바일 제목 패턴 매칭 실패. 소스 확인이 필요합니다.");
            // 텍스트 검색으로라도 확인
            if (html.includes('방송')) console.log("페이지 내에 '방송' 단어는 존재합니다.");
        }
    } catch (e) {
        console.log(`❌ 실패: ${e.message}`);
    }
    return false;
}

fetchMobileTitles();
