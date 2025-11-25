import React, { useEffect, useState } from 'react';
import { getCurrentSummoner, getRankedStats } from '../services/api';

const Dashboard = ({ onSummonerLoaded }) => {
    const [summoner, setSummoner] = useState(null);
    const [ranked, setRanked] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const summonerData = await getCurrentSummoner();
                setSummoner(summonerData);
                onSummonerLoaded(summonerData); // Notify parent

                try {
                    const rankedData = await getRankedStats();
                    setRanked(rankedData);
                } catch (e) {
                    console.warn("Could not fetch ranked stats", e);
                }
            } catch (err) {
                setError("Could not connect to League Client. Is it running?");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000); // Poll every 5s if not connected
        return () => clearInterval(interval);
    }, []);

    if (loading && !summoner) return <div className="loading">Connecting to League Client...</div>;
    if (error && !summoner) return <div className="loading">{error}</div>;

    return (
        <div className="card">
            <div className="header">
                <img
                    src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId}.jpg`}
                    className="summoner-icon"
                    alt="Profile Icon"
                    onError={(e) => { e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/0.jpg' }}
                />
                <div>
                    <h1>{summoner.displayName || summoner.gameName}</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Level {summoner.summonerLevel}</p>
                    {ranked && ranked.queues && (
                        <div>
                            {ranked.queues.map(q => (
                                <div key={q.queueType}>
                                    {q.queueType}: {q.tier} {q.division} ({q.leaguePoints} LP)
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
