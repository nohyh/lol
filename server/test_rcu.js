const https = require('https');
const axios = require('axios');

const port = '62664';
const password = 'jld4CaLWMV2dHxJLJo-HCg';
const auth = Buffer.from(`riot:${password}`).toString('base64');
const agent = new https.Agent({ rejectUnauthorized: false });

async function run() {
    console.log('Testing Riot Client API...');
    try {
        const response = await axios({
            url: `https://127.0.0.1:${port}/product-session/v1/external-sessions`,
            method: 'GET',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            httpsAgent: agent
        });

        const sessions = response.data;
        console.log('Sessions found:', Object.keys(sessions).length);

        for (const key in sessions) {
            const session = sessions[key];
            console.log(`Session ${key}:`, session.productId);

            if (session.process) {
                console.log('Process Info:', session.process);
            }

            if (session.launchConfiguration && session.launchConfiguration.arguments) {
                const args = session.launchConfiguration.arguments;
                console.log('Arguments:', args);

                let lcuPort = null;
                let lcuPass = null;

                args.forEach(arg => {
                    if (arg.startsWith('--app-port=')) {
                        lcuPort = arg.split('=')[1];
                    }
                    if (arg.startsWith('--remoting-auth-token=')) {
                        lcuPass = arg.split('=')[1];
                    }
                });

                if (lcuPort && lcuPass) {
                    console.log('---------------------------------------------------');
                    console.log('FOUND LCU CREDENTIALS!');
                    console.log(`Port: ${lcuPort}`);
                    console.log(`Password: ${lcuPass}`);
                    console.log('---------------------------------------------------');
                }
            }
        }

    } catch (error) {
        console.log(`[FAILED] ${error.message}`);
        if (error.response) {
            console.log('Response data:', error.response.data);
        }
    }
}

run();
