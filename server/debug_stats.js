const connector = require('./connector');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'debug_output.txt');
const log = (msg) => {
    console.log(msg);
    fs.appendFileSync(logFile, msg + '\n');
};

const runDebug = async () => {
    fs.writeFileSync(logFile, ''); // Clear log
    log('--- DEBUGGING STATS GENERATION ---');

    try {
        await connector.start();
    } catch (e) {
        log(`Failed to connect: ${e}`);
        return;
    }

    // 1. Get Match History
    const matchHistory = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=1');
    if (!matchHistory || !matchHistory.games) {
        log('No matches found.');
        return;
    }

    const game = matchHistory.games.games[0];
    log(`\nGame ID: ${game.gameId}`);

    log('Keys in game object: ' + Object.keys(game).join(', '));

    if (game.participantIdentities) {
        log('Found participantIdentities array! Length: ' + game.participantIdentities.length);
        log('First identity: ' + JSON.stringify(game.participantIdentities[0], null, 2));
    } else {
        log('No participantIdentities array found.');
    }

    if (game.participants && game.participants.length > 0) {
        log('First participant object keys: ' + Object.keys(game.participants[0]).join(', '));
        log('First participant object (partial): ' + JSON.stringify(game.participants[0], null, 2).substring(0, 500) + '...');
    }

    process.exit(0);
};

runDebug();
