const connector = require('./connector');

const runDebug = async () => {
    console.log('--- DEBUGGING FULL GAME DATA ---');
    try {
        await connector.start();
    } catch (e) {
        console.error(`Failed to connect: ${e}`);
        return;
    }

    const gameId = 10424496670; // Example ID from previous log
    console.log(`Fetching full data for Game ID: ${gameId}`);

    try {
        const game = await connector.request(`/lol-match-history/v1/games/${gameId}`);
        console.log(`Game Found!`);
        console.log(`Participants count: ${game.participants ? game.participants.length : 0}`);
        console.log(`ParticipantIdentities count: ${game.participantIdentities ? game.participantIdentities.length : 0}`);

        if (game.participants && game.participants.length > 1) {
            console.log('SUCCESS: Full game data contains multiple players.');
        } else {
            console.log('FAILURE: Still only seeing 1 player.');
        }

    } catch (e) {
        console.error(`Error fetching game: ${e.message}`);
    }

    process.exit(0);
};

runDebug();
