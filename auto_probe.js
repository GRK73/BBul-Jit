const axios = require('axios');

async function bruteForceAPI() {
    const streamerId = 'bambe53';
    const baseUrl = 'https://api.sooplive.co.kr';
    
    // 가능성 있는 모든 API 패턴 조합
    const patterns = [
        `/h/v1/channels/${streamerId}/posts`,
        `/h/v1/channels/${streamerId}/boards`,
        `/v1/channels/${streamerId}/posts`,
        `/station/${streamerId}/posts`,
        `/station/${streamerId}/boards`,
        `/api/${streamerId}/station`,
        `/api/${streamerId}/board/list`,
        `/h/v1/channel/${streamerId}/posts`
    ];

    console.log(`[Brute Force] ${streamerId} API 탐색 시작...`);

    for (const path of patterns) {
        const url = `${baseUrl}${path}`;
        try {
            const res = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Origin': 'https://www.sooplive.co.kr',
                    'Referer': `https://www.sooplive.co.kr/station/${streamerId}`
                },
                timeout: 3000
            });
            
            console.log(`✅ [성공] ${url}`);
            if (res.data) {
                console.log("응답 데이터 일부:", JSON.stringify(res.data).substring(0, 100));
                process.exit(0); // 성공 시 즉시 종료
            }
        } catch (e) {
            // console.log(`❌ [실패] ${url} (${e.response ? e.response.status : e.message})`);
        }
    }
    console.log("모든 패턴 실패.");
    process.exit(1);
}

bruteForceAPI();
