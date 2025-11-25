const express = require('express');
const cors = require('cors');
const connector = require('./connector');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const ensureConnected = (req, res, next) => {
    if (!connector.isConnected) {
        return res.status(503).json({ error: 'LCU not connected' });
    }
    next();
};

app.get('/api/summoner/current', ensureConnected, async (req, res) => {
    try {
        const data = await connector.request('/lol-summoner/v1/current-summoner');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/matches', ensureConnected, async (req, res) => {
    try {
        const data = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/match/:id', ensureConnected, async (req, res) => {
    try {
        const { id } = req.params;
        const data = await connector.request(`/lol-match-history/v1/games/${id}`);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/ranked', ensureConnected, async (req, res) => {
    try {
        const data = await connector.request('/lol-ranked/v1/current-ranked-stats');
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/stats/advanced', ensureConnected, async (req, res) => {
    try {
        // Fetch match history (get 100 to ensure we have enough ranked games)
        const matchHistory = await connector.request('/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=100');
        const allGames = matchHistory.games?.games || [];

        // Filter for ranked games only (Solo/Duo: 420, Flex: 440)
        const rankedGames = allGames.filter(game => game.queueId === 420 || game.queueId === 440);

        // Get last 15 ranked games (or all if less than 15)
        const games = rankedGames.slice(0, 15);

        if (games.length === 0) {
            return res.json({ gamesAnalyzed: 0, error: '没有排位赛数据' });
        }

        // Initialize accumulators
        let totalKills = 0, totalDeaths = 0, totalAssists = 0;
        let totalDamage = 0, totalDamageTaken = 0;
        let totalDamageShare = 0, totalDamageTakenShare = 0;
        let totalParticipation = 0;
        let totalCS = 0, totalDuration = 0;
        let wins = 0, losses = 0;
        let mvpCount = 0, svpCount = 0;
        let gamesAnalyzed = 0;

        // Process each game
        for (const game of games) {
            if (!game.participants || game.participants.length === 0) continue;

            // The first participant is always the current summoner in LCU match history
            const player = game.participants[0];
            if (!player || !player.stats) continue;

            const stats = player.stats;
            const gameDuration = (game.gameDuration || 1800) / 60; // Convert to minutes

            // Find player's team
            const team = game.participants.filter(p => p.teamId === player.teamId);
            if (team.length === 0) continue;

            // Calculate team totals
            const teamKills = team.reduce((sum, p) => sum + (p.stats?.kills || 0), 0);
            const teamDamage = team.reduce((sum, p) => sum + (p.stats?.totalDamageDealtToChampions || 0), 0);
            const teamDamageTaken = team.reduce((sum, p) => sum + (p.stats?.totalDamageTaken || 0), 0);

            // Calculate player metrics
            const playerKills = stats.kills || 0;
            const playerDeaths = stats.deaths || 0;
            const playerAssists = stats.assists || 0;
            const playerDamage = stats.totalDamageDealtToChampions || 0;
            const playerDamageTaken = stats.totalDamageTaken || 0;
            const playerCS = (stats.totalMinionsKilled || 0) + (stats.neutralMinionsKilled || 0);

            // Accumulate stats
            totalKills += playerKills;
            totalDeaths += playerDeaths;
            totalAssists += playerAssists;
            totalDamage += playerDamage;
            totalDamageTaken += playerDamageTaken;
            totalCS += playerCS;
            totalDuration += gameDuration;

            // Calculate percentages for this game
            const damageShare = teamDamage > 0 ? (playerDamage / teamDamage) * 100 : 0;
            const damageTakenShare = teamDamageTaken > 0 ? (playerDamageTaken / teamDamageTaken) * 100 : 0;
            const participation = teamKills > 0 ? ((playerKills + playerAssists) / teamKills) * 100 : 0;

            totalDamageShare += damageShare;
            totalDamageTakenShare += damageTakenShare;
            totalParticipation += participation;

            // Win/Loss tracking
            if (stats.win) {
                wins++;
            } else {
                losses++;
            }

            // MVP/SVP calculation - highest KDA in the team
            const playerKDA = (playerKills + playerAssists) / Math.max(playerDeaths, 1);
            const teamKDAs = team.map(p => {
                const k = p.stats?.kills || 0;
                const d = p.stats?.deaths || 0;
                const a = p.stats?.assists || 0;
                return (k + a) / Math.max(d, 1);
            });
            const maxTeamKDA = Math.max(...teamKDAs);

            // Check if player has the highest KDA (with small tolerance for floating point comparison)
            if (Math.abs(playerKDA - maxTeamKDA) < 0.01) {
                if (stats.win) {
                    mvpCount++;
                } else {
                    svpCount++;
                }
            }

            gamesAnalyzed++;
        }

        if (gamesAnalyzed === 0) {
            return res.json({ gamesAnalyzed: 0, error: '无法匹配玩家数据' });
        }

        // Calculate averages
        const avgKDA = ((totalKills + totalAssists) / Math.max(totalDeaths, 1)).toFixed(2);
        const avgKills = (totalKills / gamesAnalyzed).toFixed(1);
        const avgDeaths = (totalDeaths / gamesAnalyzed).toFixed(1);
        const avgAssists = (totalAssists / gamesAnalyzed).toFixed(1);
        const winRate = ((wins / gamesAnalyzed) * 100).toFixed(1);
        const avgDamageShare = (totalDamageShare / gamesAnalyzed).toFixed(1);
        const avgDamageTakenShare = (totalDamageTakenShare / gamesAnalyzed).toFixed(1);
        const avgParticipation = (totalParticipation / gamesAnalyzed).toFixed(1);
        const csPerMin = (totalCS / totalDuration).toFixed(1);
        const mvpRate = wins > 0 ? ((mvpCount / wins) * 100).toFixed(1) : '0.0';
        const svpRate = losses > 0 ? ((svpCount / losses) * 100).toFixed(1) : '0.0';

        res.json({
            gamesAnalyzed,
            kda: avgKDA,
            avgKills,
            avgDeaths,
            avgAssists,
            winRate,
            avgDamage: Math.round(totalDamage / gamesAnalyzed),
            avgDamageShare,
            avgDamageTaken: Math.round(totalDamageTaken / gamesAnalyzed),
            avgDamageTakenShare,
            participationRate: avgParticipation,
            csPerMin,
            mvpRate,
            svpRate,
            totalWins: wins,
            totalLosses: losses,
            mvpCount,
            svpCount
        });
    } catch (error) {
        console.error('Stats error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    connector.start();
});
