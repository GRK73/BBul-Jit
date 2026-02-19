const { execSync } = require('child_process');
const fs = require('fs-extra');
const { Groq } = require('groq-sdk');
const path = require('path');

const CONFIG = {
    INTERVAL: 5 * 60 * 1000, 
    GROQ_MODEL: 'llama-3.1-8b-instant',
    DATA_PATH: path.join(__dirname, 'data.json'),
    KEY_PATH: path.join(__dirname, 'GROQ_KEY.txt'),
    STREAMERS_PATH: path.join(__dirname, 'streamers.json')
};

let groq;
try {
    const apiKey = fs.readFileSync(CONFIG.KEY_PATH, 'utf8').trim();
    groq = new Groq({ apiKey });
} catch (e) {}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// PowerShell로 HTML 소스 긁어오기 (구 버전 페이지)
function fetchLegacyPage(streamerId) {
    const url = `https://bj.afreecatv.com/${streamerId}/posts`;
    // -UseBasicParsing: IE 엔진 사용 안함 (빠름)
    // -UserAgent: 최신 크롬인 척
    const command = `$ProgressPreference = 'SilentlyContinue'; (Invoke-WebRequest -UseBasicParsing -Uri "${url}" -UserAgent "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36").Content`;
    
    try {
        const html = execSync(command, { shell: 'powershell.exe', encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
        
        // 1. "title":"..." 패턴 (JSON 데이터)
        const matches = html.match(/"title":"([^"]+)"/g);
        if (matches && matches.length > 0) {
            console.log(`    ✅ [HTML] ${matches.length}개 발견`);
            return matches.map((m, i) => ({
                title: m.match(/"title":"([^"]+)"/)[1],
                title_no: 999999 - i, // 가상 ID
                write_date: new Date().toISOString().split('T')[0] // 오늘 날짜 가정
            })).slice(0, 5);
        }
        
        // 2. <a ... class="title">...</a> 패턴 (HTML 태그)
        // 구 버전 페이지는 HTML 태그 안에 제목이 있을 수 있음
        const tagMatches = html.match(/class="title">([^<]+)</g);
        if (tagMatches && tagMatches.length > 0) {
             console.log(`    ✅ [Tags] ${tagMatches.length}개 발견`);
             return tagMatches.map((m, i) => ({
                title: m.match(/>([^<]+)</)[1].trim(),
                title_no: 888888 - i,
                write_date: new Date().toISOString().split('T')[0]
             })).slice(0, 5);
        }

    } catch (e) {
        // console.log(`    ❌ ${streamerId} 크롤링 실패`);
    }
    return [];
}

async function analyzeSchedules(streamerId, posts) {
    if (!posts || posts.length === 0) return [];
    const titles = posts.map(p => p.title).join('\n');
    const prompt = `스트리머 '${streamerId}'의 제목들 중 방송 일정(날짜, 시간)을 찾아 JSON으로 추출해. 양식: {"schedules": [{"who": "${streamerId}", "date": "YYYY-MM-DD", "time": "HH:MM", "content": "내용"}]}`;
    
    try {
        const completion = await groq.chat.completions.create({
            messages: [{ role: "user", content: `${prompt}\n\n제목들:\n${titles}` }],
            model: CONFIG.GROQ_MODEL,
            response_format: { type: "json_object" }
        });
        return JSON.parse(completion.choices[0].message.content).schedules || [];
    } catch (e) { return []; }
}

async function run() {
    console.log(`\n[${new Date().toLocaleTimeString()}] 구 버전 페이지 크롤링 시작...`);
    const streamersData = await fs.readJson(CONFIG.STREAMERS_PATH);
    const streamers = Object.values(streamersData).flat();
    const db = await (fs.existsSync(CONFIG.DATA_PATH) ? fs.readJson(CONFIG.DATA_PATH) : { lastProcessedIds: {}, schedules: {} });

    for (const id of streamers) {
        process.stdout.write(`- ${id} 확인 중... `);
        const newPosts = await fetchLegacyPage(id);
        
        if (newPosts.length > 0) {
            const news = await analyzeSchedules(id, newPosts);
            if (news.length > 0) {
                if (!db.schedules[id]) db.schedules[id] = [];
                news.forEach(item => {
                    const isDup = db.schedules[id].some(s => s.date === item.date && s.content === item.content);
                    if (!isDup) {
                        db.schedules[id].push(item);
                        console.log(`\n    ✨ 일정 추가: [${item.date}] ${item.content}`);
                    }
                });
            }
            // 가상 ID 저장 (중복 방지용)
            db.lastProcessedIds[id] = Math.max(...newPosts.map(p => Number(p.title_no)));
        } else {
            process.stdout.write(`(데이터 없음)\n`);
        }
        await sleep(1500); // 1.5초 대기 (차단 방지)
    }

    await fs.writeJson(CONFIG.DATA_PATH, db, { spaces: 2 });
    console.log(`[${new Date().toLocaleTimeString()}] 수집 완료.`);
}

run();
setInterval(run, CONFIG.INTERVAL);
