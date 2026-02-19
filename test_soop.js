const axios = require('axios');

async function getAllPosts(streamerId) {
    const stationUrl = `https://bjapi.afreecatv.com/api/${streamerId}/station`;
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Referer': `https://ch.soop.st/${streamerId}`,
        'Origin': 'https://ch.soop.st'
    };

    try {
        const { data: stationData } = await axios.get(stationUrl, { headers });
        const nick = stationData.station.user_nick;
        const boards = stationData.bbs_list || [];

        console.log(`\n========================================`);
        console.log(`📡 Streamer: ${nick} (${streamerId})`);
        console.log(`========================================`);

        for (const board of boards) {
            // board_type 0 is usually 'Notice/Free Board'
            const listUrl = `https://bjapi.afreecatv.com/api/${streamerId}/board/${board.bbs_no}/list?page_no=1`;
            try {
                const { data: boardData } = await axios.get(listUrl, { headers });
                if (boardData.data && boardData.data.length > 0) {
                    console.log(`\n📋 [Board] ${board.bbs_name} (${boardData.data.length} posts found)`);
                    boardData.data.slice(0, 5).forEach(post => {
                        console.log(` - [${post.write_date}] ${post.title}`);
                    });
                }
            } catch (e) {
                // Silently skip locked boards
            }
        }
    } catch (error) {
        console.log(`❌ Error fetching ${streamerId}: ${error.message}`);
    }
}

// Test with bambe53
getAllPosts('bambe53');
