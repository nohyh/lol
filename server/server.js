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

        // Get current summoner info (ID and PUUID)
        const currentSummonerInfo = await connector.request('/lol-summoner/v1/current-summoner');
        const currentSummonerId = currentSummonerInfo.summonerId;
        const currentPuuid = currentSummonerInfo.puuid;

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
        for (const summaryGame of games) {
            // Fetch FULL game details to get all participants
            let game;
            try {
                game = await connector.request(`/lol-match-history/v1/games/${summaryGame.gameId}`);
            } catch (e) {
                console.warn(`Failed to fetch details for game ${summaryGame.gameId}: ${e.message}`);
                continue;
            }

            if (!game.participants || game.participants.length === 0) continue;

            let player = null;
            let participantId = null;

            // Strategy 1: Look in participantIdentities (if available) using PUUID
            if (game.participantIdentities) {
                const identity = game.participantIdentities.find(p => p.player.puuid === currentPuuid);
                if (identity) {
                    participantId = identity.participantId;
                }
            }

            // Strategy 2: Look in participantIdentities using SummonerID (loose equality)
            if (!participantId && game.participantIdentities) {
                const identity = game.participantIdentities.find(p => p.player.summonerId == currentSummonerId);
                if (identity) {
                    participantId = identity.participantId;
                }
            }

            // If we found a participantId, get the player object from participants
            if (participantId) {
                player = game.participants.find(p => p.participantId === participantId);
            }

            // Strategy 3: Look directly in participants using PUUID (some API versions)
            if (!player) {
                player = game.participants.find(p => p.puuid === currentPuuid);
            }

            // Strategy 4: Look directly in participants using SummonerID (loose equality)
            if (!player) {
                player = game.participants.find(p => p.summonerId == currentSummonerId);
            }

            // Fallback: Log warning and skip game (DO NOT use random player)
            if (!player) {
                console.warn(`Could not identify player in game ${game.gameId}. Skipping.`);
                continue;
            }

            if (!player || !player.stats) continue;

            const stats = player.stats;
            const gameDuration = (game.gameDuration || 1800) / 60; // Convert to minutes

            // Find player's team
            // Strategy 1: Filter by teamId using loose equality (==) to handle string/number mismatch
            let team = game.participants.filter(p => p.teamId == player.teamId);

            // Strategy 2: Fallback to participantId range if teamId matching failed (e.g. team size < 2)
            // Standard LoL: 1-5 is Team 100 (Blue), 6-10 is Team 200 (Red)
            if (team.length < 2 && player.participantId) {
                const isTeam100 = player.participantId <= 5;
                team = game.participants.filter(p => isTeam100 ? p.participantId <= 5 : p.participantId > 5);
            }

            // Fallback 3: Index based (Last resort if participantId is missing/weird)
            if (team.length < 2) {
                const playerIndex = game.participants.findIndex(p => p === player);
                if (playerIndex >= 0) {
                    const isBlue = playerIndex < 5;
                    team = isBlue ? game.participants.slice(0, 5) : game.participants.slice(5, 10);
                }
            }

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

            // --- Weighted MVP/SVP Calculation ---
            // Calculate scores for all team members
            const teamScores = team.map(p => {
                const pStats = p.stats || {};
                const k = pStats.kills || 0;
                const d = pStats.deaths || 0;
                const a = pStats.assists || 0;
                const dmg = pStats.totalDamageDealtToChampions || 0;
                const taken = pStats.totalDamageTaken || 0;
                const vision = pStats.visionScore || 0;

                const kda = (k + a) / Math.max(d, 1);
                const dmgShare = teamDamage > 0 ? dmg / teamDamage : 0;
                const takenShare = teamDamageTaken > 0 ? taken / teamDamageTaken : 0;
                const particip = teamKills > 0 ? (k + a) / teamKills : 0;

                return {
                    participantId: p.participantId,
                    kda,
                    dmgShare,
                    takenShare,
                    vision,
                    particip
                };
            });

            // Find max values in team for normalization
            const maxKDA = Math.max(...teamScores.map(s => s.kda), 1);
            const maxDmgShare = Math.max(...teamScores.map(s => s.dmgShare), 0.01);
            const maxTakenShare = Math.max(...teamScores.map(s => s.takenShare), 0.01);
            const maxVision = Math.max(...teamScores.map(s => s.vision), 1);
            const maxParticip = Math.max(...teamScores.map(s => s.particip), 0.01);

            // Calculate final weighted score for each player
            // Weights: KDA 30%, Damage 25%, Taken 15%, Vision 15%, Participation 15%
            const scoredTeam = teamScores.map(s => {
                const score =
                    (s.kda / maxKDA) * 30 +
                    (s.dmgShare / maxDmgShare) * 25 +
                    (s.takenShare / maxTakenShare) * 15 +
                    (s.vision / maxVision) * 15 +
                    (s.particip / maxParticip) * 15;
                return { ...s, score };
            });

            // Find the player with the highest score
            const bestPlayer = scoredTeam.reduce((prev, current) => (prev.score > current.score) ? prev : current);

            // Check if current player is the best player
            if (bestPlayer.participantId === player.participantId) {
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
