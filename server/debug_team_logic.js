const connector = require('./connector');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'debug_team_output.txt');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

const runDebug = async () => {
    fs.writeFileSync(logFile, '');
    log('--- DEBUGGING TEAM LOGIC ---');

    try {
        await connector.start();
    } catch (e) {
        log(`Failed to connect: ${e}`);
        return;
    }

    const currentSummonerInfo = await connector.request('/lol-summoner/v1/current-summoner');
    const currentSummonerId = currentSummonerInfo.summonerId;
    const currentPuuid = currentSummonerInfo.puuid;

    log(`Current Summoner: ${currentSummonerInfo.displayName} (ID: ${currentSummonerId}, PUUID: ${currentPuuid})`);

    const matchHistory = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=5');
    const games = matchHistory.games?.games || [];

    log(`Found ${games.length} games. Checking first 3...`);

    for (const game of games.slice(0, 3)) {
        log(`\n=== Game ID: ${game.gameId} ===`);

        // --- Player ID Logic ---
        let player = null;
        let participantId = null;

        if (game.participantIdentities) {
            const identity = game.participantIdentities.find(p => p.player.puuid === currentPuuid);
            if (identity) participantId = identity.participantId;
        }
        if (!participantId && game.participantIdentities) {
            const identity = game.participantIdentities.find(p => p.player.summonerId == currentSummonerId);
            if (identity) participantId = identity.participantId;
        }
        if (participantId) {
            player = game.participants.find(p => p.participantId === participantId);
        }
        if (!player) player = game.participants.find(p => p.puuid === currentPuuid);
        if (!player) player = game.participants.find(p => p.summonerId == currentSummonerId);

        if (!player) {
            log('CRITICAL: Player not found in this game.');
            continue;
        }

        log(`Player Found: PartID=${player.participantId}, TeamID=${player.teamId} (Type: ${typeof player.teamId})`);

        // --- Team Logic Debugging ---

        // Strategy 1
        let team1 = game.participants.filter(p => p.teamId == player.teamId);
        log(`Strategy 1 (TeamID Match): Found ${team1.length} players.`);
        team1.forEach(p => log(` - P${p.participantId} Team:${p.teamId}`));

        // Strategy 2
        let team2 = [];
        if (player.participantId) {
            const isTeam100 = player.participantId <= 5;
            team2 = game.participants.filter(p => isTeam100 ? p.participantId <= 5 : p.participantId > 5);
            log(`Strategy 2 (PartID Range): Found ${team2.length} players. (isTeam100=${isTeam100})`);
        } else {
            log('Strategy 2 Skipped: No participantId on player object.');
        }

        // Strategy 3
        let team3 = [];
        const playerIndex = game.participants.findIndex(p => p === player); // Strict equality check
        log(`Strategy 3 (Index): Player Index = ${playerIndex}`);
        if (playerIndex >= 0) {
            const isBlue = playerIndex < 5;
            team3 = isBlue ? game.participants.slice(0, 5) : game.participants.slice(5, 10);
            log(`Strategy 3 Result: Found ${team3.length} players.`);
        }

        // Final Decision
        let finalTeam = team1;
        if (finalTeam.length < 2 && player.participantId) finalTeam = team2;
        if (finalTeam.length < 2) finalTeam = team3;

        log(`FINAL TEAM SIZE: ${finalTeam.length}`);

        // Check stats
        const teamDamage = finalTeam.reduce((sum, p) => sum + (p.stats?.totalDamageDealtToChampions || 0), 0);
        const playerDamage = player.stats?.totalDamageDealtToChampions || 0;
        const share = teamDamage > 0 ? (playerDamage / teamDamage) * 100 : 0;
        log(`Calculated Damage Share: ${share.toFixed(1)}% (Player: ${playerDamage}, Team: ${teamDamage})`);
    }

    process.exit(0);
};

runDebug();
