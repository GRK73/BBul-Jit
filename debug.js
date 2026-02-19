const { execSync } = require('child_process');
const fs = require('fs');

function fetchTrueTitles(streamerId) {
    const url = `https://www.sooplive.co.kr/station/${streamerId}`;
    console.log(`[Target] Scraping via PowerShell: ${url}`);

    try {
        // PowerShell로 페이지 소스 전체 가져오기
        const command = `$ProgressPreference = 'SilentlyContinue'; (Invoke-WebRequest -UseBasicParsing -Uri "${url}" -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36").Content`;
        const html = execSync(command, { shell: 'powershell.exe', encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });

        console.log(" - Page Source Fetched. Analyzing...");

        // 1. 유니코드 디코딩 시도
        const decoded = html.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => String.fromCharCode(parseInt(grp, 16)));
        
        // 2. "title":"..." 패턴 검색 (더 넓은 범위)
        const titles = [];
        const regex = /"title":"([^"]+)"/g;
        let match;
        while ((match = regex.exec(decoded)) !== null) {
            const t = match[1];
            // 노이즈 필터링 (너무 짧거나 시스템 문구 제외)
            if (t.length > 5 && !['SOOP', 'Station', 'Home'].some(word => t.includes(word))) {
                titles.push(t);
            }
        }

        const uniqueTitles = [...new Set(titles)].slice(0, 10);
        if (uniqueTitles.length > 0) {
            console.log(`✅ SUCCESS! Found ${uniqueTitles.length} titles.`);
            uniqueTitles.forEach(t => console.log(` - ${t}`));
            return uniqueTitles;
        } else {
            console.log("No titles found. Trying alternative keyword search...");
            // 게시글 제목에 흔히 들어가는 키워드로 주변 텍스트 탐색
            const keywords = ['방송', '일정', '스케줄', '공지'];
            keywords.forEach(kw => {
                if (decoded.includes(kw)) console.log(`Found keyword: ${kw}`);
            });
        }
    } catch (e) {
        console.log(`❌ Failed: ${e.message}`);
    }
    return [];
}

fetchTrueTitles('bambe53');
