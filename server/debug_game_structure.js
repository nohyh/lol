const connector = require('./connector');
const fs = require('fs');

async function debugGameStructure() {
    try {
        await connector.start();

        const matchHistory = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=2');
        const allGames = matchHistory.games?.games || [];

        const rankedGames = allGames.filter(game => game.queueId === 420 || game.queueId === 440);

        if (rankedGames.length > 0) {
            const game = rankedGames[0];

            // Save full game object to file
            fs.writeFileSync('game_debug.json', JSON.stringify(game, null, 2));
            console.log('✓ Full game object saved to game_debug.json');
            console.log('\nKey findings:');
            console.log('- participants count:', game.participants?.length);
            console.log('- teams count:', game.teams?.length);
            console.log('- Has teams?', !!game.teams);
            if (game.teams && game.teams[0]) {
                console.log('- Team[0] keys:', Object.keys(game.teams[0]));
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

debugGameStructure();
