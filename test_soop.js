const bjid = 'navixx';
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

async function checkLive() {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: body.toString()
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
        
        if (data.CHANNEL && data.CHANNEL.RESULT === 1) {
            console.log(`
[상태] ${data.CHANNEL.BJNICK}(${bjid})님은 현재 방송 중입니다!`);
            console.log(`[제목] ${data.CHANNEL.TITLE}`);
        } else {
            console.log(`
[상태] ${bjid}님은 현재 방송 중이 아닙니다. (결과 코드: ${data.CHANNEL ? data.CHANNEL.RESULT : '알 수 없음'})`);
        }
    } catch (error) {
        console.error('에러 발생:', error);
    }
}

checkLive();
