import React, { useEffect, useState } from 'react';
import { getMatches, getMatchDetails } from '../services/api';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const Analysis = ({ summoner }) => {
    const [matches, setMatches] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!summoner) return;

        const analyze = async () => {
            setLoading(true);
            try {
                const matchList = await getMatches();
                // LCU match history list might differ in structure, usually it has 'games' array
                const games = matchList.games ? matchList.games.games : (Array.isArray(matchList) ? matchList : []);

                // Take last 10 games for analysis
                const recentGames = games.slice(0, 10);

                let totalKills = 0;
                let totalDeaths = 0;
                let totalAssists = 0;
                let wins = 0;
                const kdaHistory = [];

                // We might need to fetch details if the list doesn't have enough info
                // But LCU match history list usually has basic stats

                for (const game of recentGames) {
                    const participant = game.participants[0]; // Usually the current summoner is the first one or we need to find by summonerId
                    // Actually in LCU /matches endpoint, it returns the history FOR the summoner, so we need to find the participant that matches our summoner
                    // But often the LCU response is simplified. Let's assume we can find stats.

                    // Note: LCU structure is complex. Let's try to use what we have.
                    // If game.participants exists, we look for our summoner.

                    const stats = participant.stats;
                    totalKills += stats.kills;
                    totalDeaths += stats.deaths;
                    totalAssists += stats.assists;
                    if (stats.win) wins++;

                    const kda = (stats.kills + stats.assists) / (stats.deaths || 1);
                    kdaHistory.push(kda.toFixed(2));
                }

                setStats({
                    kda: ((totalKills + totalAssists) / (totalDeaths || 1)).toFixed(2),
                    winrate: ((wins / recentGames.length) * 100).toFixed(0),
                    avgKills: (totalKills / recentGames.length).toFixed(1),
                    avgDeaths: (totalDeaths / recentGames.length).toFixed(1),
                    avgAssists: (totalAssists / recentGames.length).toFixed(1),
                    history: kdaHistory.reverse() // Oldest to newest
                });
                setMatches(recentGames);

            } catch (e) {
                console.error("Analysis error", e);
            } finally {
                setLoading(false);
            }
        };

        analyze();
    }, [summoner]);

    if (loading) return <div className="card">Analyzing recent matches...</div>;
    if (!stats) return null;

    const chartData = {
        labels: stats.history.map((_, i) => `Game ${i + 1}`),
        datasets: [
            {
                label: 'KDA Trend',
                data: stats.history,
                borderColor: '#c8aa6e',
                backgroundColor: 'rgba(200, 170, 110, 0.5)',
            },
        ],
    };

    return (
        <div className="card">
            <h2>Performance Analysis (Last {matches.length} Games)</h2>
            <div className="stat-grid">
                <div className="stat-item">
                    <div className="stat-value">{stats.kda}</div>
                    <div className="stat-label">Average KDA</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.winrate}%</div>
                    <div className="stat-label">Win Rate</div>
                </div>
                <div className="stat-item">
                    <div className="stat-value">{stats.avgKills} / {stats.avgDeaths} / {stats.avgAssists}</div>
                    <div className="stat-label">Avg K/D/A</div>
                </div>
            </div>
            <div style={{ marginTop: '2rem', height: '300px' }}>
                <Line options={{ responsive: true, maintainAspectRatio: false }} data={chartData} />
            </div>
        </div>
    );
};

export default Analysis;
