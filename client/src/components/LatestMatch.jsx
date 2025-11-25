import React, { useEffect, useState } from 'react';
import { getLatestMatchDetails } from '../services/api';
const LatestMatch = ({ summoner }) => {
    const [matchData, setMatchData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!summoner) return;

        const fetchLatestMatch = async () => {
            setLoading(true);
            setError(null);
            try {
                // Get the second latest match (index 1) to see a full 10-player game
                const data = await getLatestMatchDetails(1);
                setMatchData(data);

                // Print to console for verification
                console.log('=== 最新比赛完整数据 ===');
                console.log('Game ID:', data.gameId);
                console.log('队伍1 (蓝色方) vs 队伍2 (红色方)');
                console.log('\n所有10名玩家数据:');
                data.participants?.forEach((p, idx) => {
                    const kda = `${p.stats.kills}/${p.stats.deaths}/${p.stats.assists}`;
                    console.log(`${idx + 1}. ${p.championId} (Team ${p.teamId}) - KDA: ${kda} - ${p.stats.win ? '胜利' : '失败'}`);
                });
            } catch (e) {
                console.error("Failed to fetch latest match", e);
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLatestMatch();
    }, [summoner]);

    if (loading) {
        return (
            <div className="card">
                <h2 className="card-title">🎮 最新比赛详情</h2>
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <div className="loading-text" style={{ marginTop: '1rem' }}>正在加载最新比赛数据...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <h2 className="card-title">🎮 最新比赛详情</h2>
                <div style={{ color: 'var(--danger)', padding: '1rem' }}>
                    错误: {error}
                </div>
            </div>
        );
    }

    if (!matchData || !matchData.participants) return null;

    // Split participants by team
    const team100 = matchData.participants.filter(p => p.teamId === 100);
    const team200 = matchData.participants.filter(p => p.teamId === 200);

    const PlayerRow = ({ player, index }) => {
        const kda = `${player.stats.kills}/${player.stats.deaths}/${player.stats.assists}`;
        const kdaRatio = ((player.stats.kills + player.stats.assists) / Math.max(player.stats.deaths, 1)).toFixed(2);
        const isWin = player.stats.win;

        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.75rem',
                background: isWin ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                marginBottom: '0.5rem',
                borderLeft: `4px solid ${isWin ? 'var(--success)' : 'var(--danger)'}`
            }}>
                <div style={{
                    width: '30px',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    fontWeight: 600
                }}>
                    {index}
                </div>
                <div style={{ flex: 1, fontWeight: 600, fontSize: '1rem' }}>
                    英雄ID: {player.championId}
                </div>
                <div style={{
                    fontWeight: 700,
                    fontSize: '1.125rem',
                    color: parseFloat(kdaRatio) >= 3 ? 'var(--accent-gold)' : 'var(--text-primary)'
                }}>
                    {kda}
                </div>
                <div style={{
                    marginLeft: '1rem',
                    color: 'var(--text-secondary)',
                    fontSize: '0.9rem'
                }}>
                    KDA: {kdaRatio}
                </div>
            </div>
        );
    };

    return (
        <div className="card">
            <h2 className="card-title">🎮 第二新比赛详情 - 验证数据</h2>
            <div style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
                Game ID: {matchData.gameId} | 时长: {Math.floor(matchData.gameDuration / 60)}分钟
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <h3 style={{
                    color: 'var(--primary)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span style={{
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                    }}>
                        蓝色方 (Team 100)
                    </span>
                    {team100[0]?.stats?.win && <span style={{ color: 'var(--success)' }}>✓ 胜利</span>}
                </h3>
                {team100.map((player, idx) => (
                    <PlayerRow key={player.participantId} player={player} index={idx + 1} />
                ))}
            </div>

            <div>
                <h3 style={{
                    color: 'var(--danger)',
                    marginBottom: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    <span style={{
                        background: 'var(--danger)',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.9rem'
                    }}>
                        红色方 (Team 200)
                    </span>
                    {team200[0]?.stats?.win && <span style={{ color: 'var(--success)' }}>✓ 胜利</span>}
                </h3>
                {team200.map((player, idx) => (
                    <PlayerRow key={player.participantId} player={player} index={idx + 1} />
                ))}
            </div>

            <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
            }}>
                💡 提示: 完整的比赛数据已打印到浏览器控制台（F12），包含所有可用字段
            </div>
        </div>
    );
};

export default LatestMatch;
