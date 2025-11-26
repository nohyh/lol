const connector = require('./connector');

const runDebug = async () => {
    console.log('--- DEBUGGING ROLE DATA ---');
    try {
        await connector.start();
    } catch (e) {
        console.error(`Failed to connect: ${e}`);
        return;
    }

    // Fetch one game to check role info
    const matchHistory = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=1');
    if (!matchHistory.games || matchHistory.games.games.length === 0) return;

    const summaryGame = matchHistory.games.games[0];
    const game = await connector.request(`/lol-match-history/v1/games/${summaryGame.gameId}`);

    if (game.participants && game.participants.length > 0) {
        const p = game.participants[0];
        console.log('Participant Keys:', Object.keys(p).join(', '));
        console.log('Timeline:', JSON.stringify(p.timeline, null, 2));
        console.log('Stats (partial):', JSON.stringify({
            win: p.stats.win,
            kills: p.stats.kills,
            role: p.stats.role,
            lane: p.stats.lane
        }, null, 2));
    }

    process.exit(0);
};

runDebug();
