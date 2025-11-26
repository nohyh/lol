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

app.get('/api/summoner/by-name/:name', ensureConnected, async (req, res) => {
    try {
        const { name } = req.params;
        // Try query param first
        try {
            const data = await connector.request(`/lol-summoner/v1/summoners?name=${encodeURIComponent(name)}`);
            return res.json(data);
        } catch (e) {
            // Fallback to by-name endpoint
            const data = await connector.request(`/lol-summoner/v1/summoners/by-name/${encodeURIComponent(name)}`);
            res.json(data);
        }
    } catch (error) {
        res.status(404).json({ error: 'Summoner not found' });
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
        const targetPuuid = req.query.puuid;
        let currentPuuid, currentSummonerId;

        if (targetPuuid) {
            // If PUUID provided, use it
            currentPuuid = targetPuuid;
            // Fetch summoner info to get ID (needed for some lookups)
            try {
                const summonerInfo = await connector.request(`/lol-summoner/v2/summoners/puuid/${targetPuuid}`);
                currentSummonerId = summonerInfo.summonerId;
            } catch (e) {
                console.warn('Could not fetch summoner info for PUUID, some lookups might fail');
            }
        } else {
            // Get current summoner info (ID and PUUID)
            const currentSummonerInfo = await connector.request('/lol-summoner/v1/current-summoner');
            currentSummonerId = currentSummonerInfo.summonerId;
            currentPuuid = currentSummonerInfo.puuid;
        }

        // Fetch match history for the specific PUUID
        // Note: The endpoint /lol-match-history/v1/products/lol/current-summoner/matches is for current
        // For specific PUUID: /lol-match-history/v1/products/lol/{puuid}/matches
        const matchHistoryEndpoint = targetPuuid
            ? `/lol-match-history/v1/products/lol/${targetPuuid}/matches?begIndex=0&endIndex=100`
            : '/lol-match-history/v1/products/lol/current-summoner/matches?begIndex=0&endIndex=100';

        const matchHistory = await connector.request(matchHistoryEndpoint);
        const allGames = matchHistory.games?.games || [];

        // Filter for ranked games only (Solo/Duo: 420, Flex: 440)
        const rankedGames = allGames.filter(game => game.queueId === 420 || game.queueId === 440);

        // Get last 50 ranked games (or all if less than 50)
        const games = rankedGames.slice(0, 50);

        if (games.length === 0) {
            return res.json({ gamesAnalyzed: 0, error: '没有排位赛数据' });
        }

        // Initialize accumulators
        let totalKills = 0, totalDeaths = 0, totalAssists = 0;
        let totalDamage = 0, totalDamageTaken = 0;
        let totalDamageShare = 0, totalDamageTakenShare = 0;
        let totalGoldShare = 0; // New: Gold Share
        let totalDamageConversion = 0; // New: Damage Conversion
        let totalParticipation = 0;
        let totalCS = 0, totalDuration = 0;
        let wins = 0, losses = 0;
        let mvpCount = 0, svpCount = 0;
        let gamesAnalyzed = 0;

        // New Accumulators
        let totalVisionScore = 0, totalWardsPlaced = 0;
        let totalGold = 0;
        let totalObjectiveDamage = 0, totalTurrets = 0;
        let totalDoubleKills = 0, totalTripleKills = 0, totalQuadraKills = 0, totalPentaKills = 0;

        // Rank Accumulators
        let totalParticipationRank = 0;
        let totalGoldRank = 0;
        let totalVisionRank = 0;
        let totalCSRank = 0;

        // Optimization: Fetch all game details in parallel
        const gamePromises = games.map(g => connector.request(`/lol-match-history/v1/games/${g.gameId}`).catch(e => {
            console.warn(`Failed to fetch details for game ${g.gameId}: ${e.message}`);
            return null;
        }));

        const detailedGames = await Promise.all(gamePromises);

        // Process each game
        for (const game of detailedGames) {
            if (!game) continue;

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
            const teamObjectiveDamage = team.reduce((sum, p) => sum + (p.stats?.damageDealtToObjectives || 0), 0);
            const teamGold = team.reduce((sum, p) => sum + (p.stats?.goldEarned || 0), 0); // New: Team Gold

            // Calculate player metrics
            const playerKills = stats.kills || 0;
            const playerDeaths = stats.deaths || 0;
            const playerAssists = stats.assists || 0;
            const playerDamage = stats.totalDamageDealtToChampions || 0;
            const playerDamageTaken = stats.totalDamageTaken || 0;
            const playerCS = (stats.totalMinionsKilled || 0) + (stats.neutralMinionsKilled || 0);

            // New Metrics
            const playerVision = stats.visionScore || 0;
            const playerWards = stats.wardsPlaced || 0;
            const playerGold = stats.goldEarned || 0;
            const playerObjDmg = stats.damageDealtToObjectives || 0;
            const playerTurrets = stats.turretKills || 0;

            // Accumulate stats
            totalKills += playerKills;
            totalDeaths += playerDeaths;
            totalAssists += playerAssists;
            totalDamage += playerDamage;
            totalDamageTaken += playerDamageTaken;
            totalCS += playerCS;
            totalDuration += gameDuration;

            // Accumulate New Stats
            totalVisionScore += playerVision;
            totalWardsPlaced += playerWards;
            totalGold += playerGold;
            totalObjectiveDamage += playerObjDmg;
            totalTurrets += playerTurrets;
            totalDoubleKills += stats.doubleKills || 0;
            totalTripleKills += stats.tripleKills || 0;
            totalQuadraKills += stats.quadraKills || 0;
            totalPentaKills += stats.pentaKills || 0;

            // Calculate percentages for this game
            const damageShare = teamDamage > 0 ? (playerDamage / teamDamage) * 100 : 0;
            const damageTakenShare = teamDamageTaken > 0 ? (playerDamageTaken / teamDamageTaken) * 100 : 0;
            const participation = teamKills > 0 ? ((playerKills + playerAssists) / teamKills) * 100 : 0;
            const goldShare = teamGold > 0 ? (playerGold / teamGold) * 100 : 0; // New: Gold Share

            // Calculate Damage Conversion Rate (Damage Share / Gold Share)
            // Avoid division by zero
            const damageConversion = goldShare > 0 ? (damageShare / goldShare) * 100 : 0;

            totalDamageShare += damageShare;
            totalDamageTakenShare += damageTakenShare;
            totalParticipation += participation;
            totalGoldShare += goldShare;
            totalDamageConversion += damageConversion;

            // Win/Loss tracking
            if (stats.win) {
                wins++;
            } else {
                losses++;
            }

            // --- Rank Calculation ---
            const getRank = (metricFn) => {
                const sorted = [...team].sort((a, b) => metricFn(b) - metricFn(a));
                return sorted.findIndex(p => p.participantId === player.participantId) + 1;
            };

            totalParticipationRank += getRank(p => (p.stats?.kills || 0) + (p.stats?.assists || 0));
            totalGoldRank += getRank(p => p.stats?.goldEarned || 0);
            totalVisionRank += getRank(p => p.stats?.visionScore || 0);
            totalCSRank += getRank(p => (p.stats?.totalMinionsKilled || 0) + (p.stats?.neutralMinionsKilled || 0));

            // --- Weighted MVP/SVP Calculation (Refined) ---
            const teamScores = team.map(p => {
                const pStats = p.stats || {};
                const k = pStats.kills || 0;
                const d = pStats.deaths || 0;
                const a = pStats.assists || 0;
                const dmg = pStats.totalDamageDealtToChampions || 0;
                const taken = pStats.totalDamageTaken || 0;
                const vision = pStats.visionScore || 0;
                const objDmg = pStats.damageDealtToObjectives || 0;

                const kda = (k + a) / Math.max(d, 1);
                const dmgShare = teamDamage > 0 ? dmg / teamDamage : 0;
                const takenShare = teamDamageTaken > 0 ? taken / teamDamageTaken : 0;
                const particip = teamKills > 0 ? (k + a) / teamKills : 0;
                const objShare = teamObjectiveDamage > 0 ? objDmg / teamObjectiveDamage : 0;

                return {
                    participantId: p.participantId,
                    kda,
                    dmgShare,
                    takenShare,
                    vision,
                    particip,
                    objShare
                };
            });

            const maxKDA = Math.max(...teamScores.map(s => s.kda), 1);
            const maxDmgShare = Math.max(...teamScores.map(s => s.dmgShare), 0.01);
            const maxTakenShare = Math.max(...teamScores.map(s => s.takenShare), 0.01);
            const maxVision = Math.max(...teamScores.map(s => s.vision), 1);
            const maxParticip = Math.max(...teamScores.map(s => s.particip), 0.01);
            const maxObjShare = Math.max(...teamScores.map(s => s.objShare), 0.01);

            const scoredTeam = teamScores.map(s => {
                const score =
                    (s.kda / maxKDA) * 30 +
                    (s.dmgShare / maxDmgShare) * 20 +
                    (s.takenShare / maxTakenShare) * 10 +
                    (s.vision / maxVision) * 15 +
                    (s.particip / maxParticip) * 15 +
                    (s.objShare / maxObjShare) * 10;
                return { ...s, score };
            });

            const bestPlayer = scoredTeam.reduce((prev, current) => (prev.score > current.score) ? prev : current);

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

        // New Averages
        const avgDamageConversion = (totalDamageConversion / gamesAnalyzed).toFixed(1); // New Metric

        // Define these BEFORE using them in Overall Evaluation
        const avgVisionScore = (totalVisionScore / gamesAnalyzed).toFixed(1);
        const avgWardsPlaced = (totalWardsPlaced / gamesAnalyzed).toFixed(1);
        const goldPerMin = (totalGold / totalDuration).toFixed(0);
        const avgObjectiveDamage = Math.round(totalObjectiveDamage / gamesAnalyzed);
        const avgTurrets = (totalTurrets / gamesAnalyzed).toFixed(1);

        // --- Overall Evaluation Calculation ---
        // Weights: MVP/SVP (30%), KDA (20%), Win Rate (20%), DmgConv (15%), Team (15%)

        // 1. MVP/SVP Score (0-100)
        // Tightened: MVP = 420 points/game, SVP = 220 points/game.
        const mvpScore = Math.min(((mvpCount * 4.2 + svpCount * 2.2) / gamesAnalyzed) * 100, 100);

        // 2. KDA Score (0-100)
        // Tightened: 3.0 KDA = 72 points.
        const kdaVal = parseFloat(avgKDA);
        let kdaScore = (kdaVal / 3.0) * 72;
        if (kdaScore > 120) kdaScore = 120;

        // 3. Win Rate Score (0-100)
        // Tightened: Base 50% WR = 62 points.
        // 50% -> 62, 60% -> 72.
        const winRateScore = parseFloat(winRate) + 12;

        // 4. Damage Conversion Score (0-100)
        // Tightened: 100% = 72 points.
        const dmgConvVal = parseFloat(avgDamageConversion);
        let dmgConvScore = (dmgConvVal / 100) * 72;
        if (dmgConvScore > 120) dmgConvScore = 120;

        // 5. Team Contribution Score (0-100)
        // Tightened: Part 50% = 72pts, Vision 1.0 = 72pts.
        const partScore = Math.min((parseFloat(avgParticipation) / 50) * 72, 100);
        const visionPerMin = parseFloat(avgVisionScore) / (totalDuration / gamesAnalyzed);
        const visionScore = Math.min((visionPerMin / 1.0) * 72, 100);
        const teamScore = (partScore + visionScore) / 2;

        // Weighted Sum
        const totalScore = (
            mvpScore * 0.30 +
            kdaScore * 0.20 +
            winRateScore * 0.20 +
            dmgConvScore * 0.15 +
            teamScore * 0.15
        ).toFixed(1);

        // Tier Assignment
        let tier = '答辩';
        if (totalScore >= 90) tier = '通天代';
        else if (totalScore >= 80) tier = '小代';
        else if (totalScore >= 70) tier = '大腿';
        else if (totalScore >= 60) tier = '小腿';
        else if (totalScore >= 50) tier = '正常人';
        else if (totalScore >= 40) tier = '小菜';
        else if (totalScore >= 30) tier = '很菜';

        // Rank Averages
        const avgParticipationRank = (totalParticipationRank / gamesAnalyzed).toFixed(1);
        const avgGoldRank = (totalGoldRank / gamesAnalyzed).toFixed(1);
        const avgVisionRank = (totalVisionRank / gamesAnalyzed).toFixed(1);
        const avgCSRank = (totalCSRank / gamesAnalyzed).toFixed(1);
        res.json({
            gamesAnalyzed,
            overallScore: totalScore, // New
            overallTier: tier,       // New
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
            svpCount,
            avgVisionScore,
            avgWardsPlaced,
            goldPerMin,
            avgObjectiveDamage,
            avgTurrets,
            avgParticipationRank,
            avgGoldRank,
            avgVisionRank,
            avgCSRank,
            avgDamageConversion,
            multiKills: {
                double: totalDoubleKills,
                triple: totalTripleKills,
                quadra: totalQuadraKills,
                penta: totalPentaKills
            }
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
