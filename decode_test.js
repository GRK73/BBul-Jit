const fs = require('fs');

try {
    const raw = fs.readFileSync('soop_next_data.txt', 'utf8');
    
    // 이중 인코딩된 유니코드 (\uXXXX)를 실제 문자로 변환
    const content = raw.replace(/\\u([0-9a-fA-F]{4})/g, (match, grp) => {
        return String.fromCharCode(parseInt(grp, 16));
    });

    console.log("--- DECODED START (Partial) ---");
    console.log(content.substring(0, 500));
    
    // 제목 추출 시도
    const titles = content.match(/"title":"(.*?)"/g);
    if (titles) {
        console.log("\nFound Potential Titles:");
        titles.slice(0, 5).forEach(t => console.log(t));
    } else {
        console.log("\nNo titles found in decoded content.");
    }
} catch (e) {
    console.error(e.message);
}
