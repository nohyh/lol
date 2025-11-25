const connector = require('./connector');

async function testLookup() {
    try {
        console.log('Connecting to LCU...');
        await connector.start();

        // 1. Get Current Summoner to have a valid name to test with
        console.log('Fetching current summoner...');
        const currentSummoner = await connector.request('/lol-summoner/v1/current-summoner');
        console.log(`Current Summoner: ${currentSummoner.displayName} (ID: ${currentSummoner.summonerId})`);

        // 2. Test Lookup by Name (using own name)
        console.log(`\nTesting lookup by name: ${currentSummoner.displayName}...`);
        // Note: Endpoint might be /lol-summoner/v1/summoners?name=... or similar
        // Usually LCU has: /lol-summoner/v1/summoners?name={name}
        try {
            const lookupByName = await connector.request(`/lol-summoner/v1/summoners?name=${encodeURIComponent(currentSummoner.displayName)}`);
            console.log('Lookup by Name Result:', JSON.stringify(lookupByName, null, 2));
        } catch (e) {
            console.log('Lookup by Name failed:', e.message);
        }

        // 3. Test Lookup by ID (using own ID)
        console.log(`\nTesting lookup by ID: ${currentSummoner.summonerId}...`);
        try {
            const lookupById = await connector.request(`/lol-summoner/v1/summoners/${currentSummoner.summonerId}`);
            console.log('Lookup by ID Result:', JSON.stringify(lookupById, null, 2));
        } catch (e) {
            console.log('Lookup by ID failed:', e.message);
        }

        // 4. Test Match History for this PUUID
        console.log(`\nTesting match history for PUUID: ${currentSummoner.puuid}...`);
        try {
            const matchHistory = await connector.request(`/lol-match-history/v1/products/lol/${currentSummoner.puuid}/matches`);
            console.log(`Found ${matchHistory.games.games.length} games in match history.`);
        } catch (e) {
            console.log('Match history lookup failed:', e.message);
        }

        process.exit(0);
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

testLookup();
