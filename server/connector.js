const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const https = require('https');
const axios = require('axios');

class LCUConnector {
    constructor() {
        this.credentials = null;
        this.checkInterval = null;
        this.isConnected = false;
    }

    async start() {
        console.log('Looking for League Client...');
        return new Promise((resolve) => {
            this.checkInterval = setInterval(async () => {
                const creds = await this.getCredentials();
                if (creds) {
                    this.credentials = creds;
                    this.isConnected = true;
                    console.log(`Connected to LCU at port ${creds.port}`);
                    clearInterval(this.checkInterval);
                    resolve(creds);
                }
            }, 2000);
        });
    }

    async getCredentials() {
        // Method 1: Check Lockfile (Prioritize Riot Client)
        const commonPaths = [
            'C:\\Riot Games\\League of Legends\\lockfile',
            'D:\\Riot Games\\League of Legends\\lockfile',
            'E:\\Riot Games\\League of Legends\\lockfile',
            'H:\\WeGameApps\\英雄联盟\\lockfile',
            'H:\\WeGameApps\\League of Legends\\lockfile',
            'H:\\WeGameApps\\英雄联盟\\LeagueClient\\lockfile'
        ];

        for (const p of commonPaths) {
            console.log(`Checking path: ${p}`);
            if (fs.existsSync(p)) {
                console.log(`Found lockfile at: ${p}`);
                try {
                    const content = fs.readFileSync(p, 'utf8');
                    console.log(`Lockfile content (JSON): ${JSON.stringify(content)}`);
                    // Lockfile format: ProcessName:PID:Port:Password:Protocol
                    const parts = content.split(':');
                    if (parts.length >= 5) {
                        return {
                            port: parts[2],
                            password: parts[3],
                            protocol: parts[4]
                        };
                    } else {
                        console.log('Invalid lockfile format');
                    }
                } catch (e) {
                    console.error(`Error reading lockfile: ${e.message}`);
                }
            }
        }

        // Method 2: Check Process (WMIC)
        const wmicResult = await new Promise((resolve) => {
            exec('wmic process where "name=\'LeagueClientUx.exe\'" get commandline', (err, stdout) => {
                if (!err && stdout) {
                    const portMatch = stdout.match(/--app-port=([0-9]+)/);
                    const passMatch = stdout.match(/--remoting-auth-token=([\w-]+)/);
                    if (portMatch && passMatch) {
                        resolve({
                            port: portMatch[1],
                            password: passMatch[1],
                            protocol: 'https'
                        });
                        return;
                    }
                }
                resolve(null);
            });
        });

        if (wmicResult) return wmicResult;

        // Method 3: Check Process (PowerShell - Fallback)
        const psResult = await new Promise((resolve) => {
            const psCommand = `Get-CimInstance Win32_Process -Filter "Name = 'LeagueClientUx.exe'" | Select-Object -ExpandProperty CommandLine`;
            exec(`powershell -Command "${psCommand}"`, (psErr, psStdout) => {
                if (psErr || !psStdout) {
                    console.log('PowerShell process check failed or empty');
                    resolve(null);
                    return;
                }

                const portMatch = psStdout.match(/--app-port=([0-9]+)/);
                const passMatch = psStdout.match(/--remoting-auth-token=([\w-]+)/);

                if (portMatch && passMatch) {
                    console.log('Found credentials via PowerShell');
                    resolve({
                        port: portMatch[1],
                        password: passMatch[1],
                        protocol: 'https'
                    });
                } else {
                    resolve(null);
                }
            });
        });

        if (psResult) return psResult;

        // Method 4: Check Log Files (PowerShell - Deep Search)
        // This is necessary for WeGame/CN clients where lockfile is empty and process args are hidden
        const logResult = await new Promise((resolve) => {
            console.log('Searching log files for credentials...');
            const psLogCommand = `
                $log = Get-ChildItem "H:\\WeGameApps\\英雄联盟" -Recurse -Filter "*LeagueClientUx.log*" | Sort-Object LastWriteTime | Select-Object -Last 1;
                if ($log) {
                    $content = Get-Content $log.FullName;
                    $port = $content | Select-String "--app-port=(\\d+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -First 1;
                    $pass = $content | Select-String "--remoting-auth-token=([\\w-]+)" | ForEach-Object { $_.Matches.Groups[1].Value } | Select-Object -First 1;
                    if ($port -and $pass) {
                        Write-Output "$port|$pass";
                    }
                }
            `;

            exec(`powershell -Command "${psLogCommand.replace(/\n/g, ' ')}"`, (err, stdout) => {
                if (!err && stdout && stdout.trim()) {
                    const [port, password] = stdout.trim().split('|');
                    if (port && password) {
                        console.log('Found credentials in log file');
                        resolve({
                            port: port,
                            password: password,
                            protocol: 'https'
                        });
                        return;
                    }
                }
                console.log('Log file search failed');
                resolve(null);
            });
        });

        if (logResult) return logResult;

        // Method 5: Hardcoded Fallback (Last Resort)
        console.log('Trying hardcoded credentials as last resort...');
        return {
            port: '53045',
            password: 'oBeTRLDLsBpm3gbLhWN4Bw',
            protocol: 'https'
        };
    }

    getRequestOptions(endpoint, method = 'GET', body = null) {
        if (!this.credentials) return null;

        const { port, password } = this.credentials;
        const auth = Buffer.from(`riot:${password}`).toString('base64');
        const agent = new https.Agent({ rejectUnauthorized: false });

        return {
            url: `https://127.0.0.1:${port}${endpoint}`,
            method,
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            httpsAgent: agent,
            data: body
        };
    }

    async request(endpoint, method = 'GET', body = null) {
        if (!this.isConnected) {
            throw new Error('Not connected to LCU');
        }

        const options = this.getRequestOptions(endpoint, method, body);
        try {
            const response = await axios(options);
            return response.data;
        } catch (error) {
            console.error(`LCU Request Error [${endpoint}]:`, error.message);
            throw error;
        }
    }
}

module.exports = new LCUConnector();
