const connector = require('./connector');

async function explore() {
    try {
        console.log('Connecting to LCU...');
        const creds = await connector.start();

        console.log('Fetching API documentation...');
        // Try to fetch the OpenAPI spec
        // Common paths: /swagger/v3/openapi.json, /help, /v2/swagger.json
        let spec = null;
        try {
            spec = await connector.request('/swagger/v3/openapi.json');
        } catch (e) {
            console.log('Failed to fetch /swagger/v3/openapi.json, trying /v2/swagger.json');
            try {
                spec = await connector.request('/v2/swagger.json');
            } catch (e2) {
                console.log('Failed to fetch Swagger specs.');
            }
        }

        if (spec) {
            console.log('---------------------------------------------------');
            console.log('LCU API CAPABILITIES ANALYSIS');
            console.log('---------------------------------------------------');

            const paths = Object.keys(spec.paths);
            console.log(`Total Endpoints: ${paths.length}`);

            const tags = new Set();
            paths.forEach(p => {
                const firstSegment = p.split('/')[1];
                if (firstSegment) tags.add(firstSegment);
            });

            console.log(`Total Categories: ${tags.size}`);
            console.log('Major Categories (Top 20):');
            Array.from(tags).slice(0, 20).forEach(t => console.log(`- ${t}`));

            console.log('---------------------------------------------------');
            console.log('Sample Data Points:');
            console.log('- Summoner Info (Level, XP, Profile Icon)');
            console.log('- Ranked Stats (Tier, LP, Wins/Losses)');
            console.log('- Match History (Detailed game stats)');
            console.log('- Champion Mastery (Points, Levels)');
            console.log('- Loot (Keys, Chests, Essence)');
            console.log('- Store (Skins, Champions)');
            console.log('- Chat (Friends, Messages)');
            console.log('- Gameflow (Queue, Champ Select, In-Game)');
            console.log('---------------------------------------------------');
        } else {
            console.log('Could not retrieve detailed API spec, but connection is working.');
        }

        process.exit(0);
    } catch (error) {
        console.error('Exploration failed:', error.message);
        process.exit(1);
    }
}

explore();
