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
                onSummonerLoaded(summonerData);

                try {
                    const rankedData = await getRankedStats();
                    setRanked(rankedData);
                } catch (e) {
                    console.warn("Could not fetch ranked stats", e);
                }
            } catch (err) {
                setError("无法连接到英雄联盟客户端。请确保客户端正在运行。");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [onSummonerLoaded]);

    if (loading && !summoner) {
        return (
            <div className="loading">
                <div className="loading-spinner"></div>
                <div className="loading-text">正在连接到英雄联盟客户端...</div>
            </div>
        );
    }

    if (error && !summoner) {
        return (
            <div className="loading">
                <div className="loading-text" style={{ color: 'var(--danger)' }}>{error}</div>
            </div>
        );
    }

    return (
        <div className="card profile-card">
            <div className="summoner-icon-wrapper">
                <div className="summoner-icon">
                    <img
                        src={`https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${summoner.profileIconId}.jpg`}
                        alt="召唤师头像"
                        onError={(e) => {
                            e.target.src = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/0.jpg'
                        }}
                    />
                </div>
                <div className="summoner-level">Lv.{summoner.summonerLevel}</div>
            </div>

            <div className="summoner-info">
                <h1>{summoner.displayName || summoner.gameName || '召唤师'}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem', fontWeight: 500 }}>
                    个人数据分析面板
                </p>

                {ranked && ranked.queues && ranked.queues.length > 0 && (
                    <div className="rank-info">
                        {ranked.queues.map(q => (
                            <div key={q.queueType} className="rank-badge">
                                <span style={{ opacity: 0.7 }}>{q.queueType === 'RANKED_SOLO_5x5' ? '单排' : '灵活排位'}: </span>
                                <span style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>
                                    {q.tier} {q.division}
                                </span>
                                <span style={{ opacity: 0.7 }}> ({q.leaguePoints} LP)</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
