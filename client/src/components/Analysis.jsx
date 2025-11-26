import React, { useEffect, useState } from 'react';
import { getAdvancedStats, getSummonerByName } from '../services/api';

const Analysis = ({ summoner: initialSummoner }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchName, setSearchName] = useState('');
    const [currentSummoner, setCurrentSummoner] = useState(initialSummoner);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!currentSummoner) return;
        fetchStats(currentSummoner.puuid);
    }, [currentSummoner]);

    const fetchStats = async (puuid) => {
        setLoading(true);
        setError(null);
        try {
            const data = await getAdvancedStats(puuid);
            setStats(data);
        } catch (e) {
            console.error("Failed to fetch stats", e);
            setError("获取数据失败，请稍后重试");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchName.trim()) return;

        setLoading(true);
        setError(null);
        try {
            const summonerData = await getSummonerByName(searchName);
            setCurrentSummoner(summonerData);
            setSearchName('');
        } catch (e) {
            console.error("Summoner not found", e);
            setError("未找到该玩家，请检查ID是否正确");
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="card">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <div className="loading-text" style={{ marginTop: '1rem' }}>正在分析数据...</div>
                </div>
            </div>
        );
    }

    return (
        <div>
            {/* Search Bar */}
            <div className="card" style={{ marginBottom: '1rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
                    <input
                        type="text"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                        placeholder="输入玩家ID查询..."
                        style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '5px',
                            border: '1px solid #444',
                            backgroundColor: '#2a2a2a',
                            color: 'white'
                        }}
                    />
                    <button type="submit" style={{
                        padding: '10px 20px',
                        borderRadius: '5px',
                        border: 'none',
                        backgroundColor: '#007bff',
                        color: 'white',
                        cursor: 'pointer'
                    }}>
                        查询
                    </button>
                </form>
                {error && <div style={{ color: '#ff4444', marginTop: '10px' }}>{error}</div>}
                {currentSummoner && (
                    <div style={{ marginTop: '10px', color: '#aaa' }}>
                        当前分析: <span style={{ color: 'white', fontWeight: 'bold' }}>{currentSummoner.displayName}</span>
                    </div>
                )}
            </div>

            {!stats ? null : (
                <>
                    {/* Overall Evaluation Card */}
                    <div className="card" style={{
                        background: 'linear-gradient(135deg, #2c3e50 0%, #000000 100%)',
                        border: '1px solid #ffd700',
                        marginBottom: '1.5rem',
                        textAlign: 'center',
                        padding: '2rem'
                    }}>
                        <div style={{ fontSize: '1.2rem', color: '#ffd700', marginBottom: '0.5rem' }}>综合评价</div>
                        <div style={{
                            fontSize: '3.5rem',
                            fontWeight: 'bold',
                            color: getTierColor(stats.overallTier),
                            textShadow: '0 0 10px rgba(255,255,255,0.3)',
                            marginBottom: '0.5rem'
                        }}>
                            {stats.overallTier}
                        </div>
                        <div style={{ fontSize: '1rem', color: '#aaa' }}>
                            评分: <span style={{ color: 'white', fontWeight: 'bold' }}>{stats.overallScore}</span>
                        </div>
                    </div>

                    <div className="card">
                        <h2 className="card-title">📊 数据统计 (最近 {stats.gamesAnalyzed} 场)</h2>

                        <div className="stats-grid">
                            {/* KDA */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">⚔️</div>
                                </div>
                                <div className="stat-label">平均KDA</div>
                                <div className={`stat-value ${getPerformanceClass(parseFloat(stats.kda), { good: 3.0, average: 2.0 })}`}>{stats.kda}</div>
                                <div className="stat-subtitle">{stats.avgKills} / {stats.avgDeaths} / {stats.avgAssists}</div>
                            </div>

                            {/* 胜率 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">🏆</div>
                                </div>
                                <div className="stat-label">胜率</div>
                                <div className={`stat-value ${getPerformanceClass(parseFloat(stats.winRate), { good: 55, average: 48 })}`}>{stats.winRate}%</div>
                                <div className="stat-subtitle">{stats.totalWins}胜 {stats.totalLosses}负</div>
                            </div>

                            {/* 场均伤害占比 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">💥</div>
                                </div>
                                <div className="stat-label">场均伤害占比</div>
                                <div className="stat-value average">{stats.avgDamageShare}%</div>
                                <div className="stat-subtitle">{(stats.avgDamage / 1000).toFixed(1)}k 输出</div>
                            </div>

                            {/* 场均承伤占比 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">🛡️</div>
                                </div>
                                <div className="stat-label">场均承伤占比</div>
                                <div className="stat-value average">{stats.avgDamageTakenShare}%</div>
                                <div className="stat-subtitle">{(stats.avgDamageTaken / 1000).toFixed(1)}k 承伤</div>
                            </div>

                            {/* 参团率 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">👥</div>
                                </div>
                                <div className="stat-label">参团率排名</div>
                                <div className="stat-value average">队内第 {stats.avgParticipationRank}</div>
                                <div className="stat-subtitle">{stats.participationRate}% 参团率</div>
                            </div>

                            {/* 经济效率 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">💰</div>
                                </div>
                                <div className="stat-label">经济排名</div>
                                <div className="stat-value average">队内第 {stats.avgGoldRank}</div>
                                <div className="stat-subtitle">{stats.goldPerMin} Gold/Min</div>
                            </div>

                            {/* 视野控制 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">👁️</div>
                                </div>
                                <div className="stat-label">视野排名</div>
                                <div className="stat-value average">队内第 {stats.avgVisionRank}</div>
                                <div className="stat-subtitle">{stats.avgVisionScore}分 / {stats.avgWardsPlaced}眼</div>
                            </div>

                            {/* 伤害转化率 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">⚡</div>
                                </div>
                                <div className="stat-label">伤害转化率</div>
                                <div className={`stat-value ${getPerformanceClass(parseFloat(stats.avgDamageConversion), { good: 140, average: 100 })}`}>
                                    {stats.avgDamageConversion}%
                                </div>
                                <div className="stat-subtitle">吃草挤奶指数</div>
                            </div>

                            {/* CS/分钟 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">🌾</div>
                                </div>
                                <div className="stat-label">补刀排名</div>
                                <div className="stat-value average">队内第 {stats.avgCSRank}</div>
                                <div className="stat-subtitle">{stats.csPerMin} CS/Min</div>
                            </div>

                            {/* MVP率 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">⭐</div>
                                </div>
                                <div className="stat-label">MVP率 (胜局)</div>
                                <div className="stat-value good">{stats.mvpRate}%</div>
                                <div className="stat-subtitle">综合评分第一</div>
                            </div>

                            {/* SVP率 */}
                            <div className="stat-card">
                                <div className="stat-header">
                                    <div className="stat-icon">💪</div>
                                </div>
                                <div className="stat-label">SVP率 (败局)</div>
                                <div className="stat-value average">{stats.svpRate}%</div>
                                <div className="stat-subtitle">综合评分第一</div>
                            </div>
                        </div>
                    </div>

                    {/* Performance Summary */}
                    <div className="card">
                        <h2 className="card-title">📈 表现总结</h2>
                        <div style={{ padding: '1rem 0' }}>
                            {parseFloat(stats.kda) >= 3.0 && (
                                <div style={{ marginBottom: '1rem', color: 'var(--success)', fontSize: '1.125rem' }}>
                                    ✨ 你的KDA非常优秀！
                                </div>
                            )}
                            {parseFloat(stats.winRate) >= 55 && (
                                <div style={{ marginBottom: '1rem', color: 'var(--success)', fontSize: '1.125rem' }}>
                                    🔥 胜率很高，继续保持！
                                </div>
                            )}
                            {parseFloat(stats.participationRate) >= 70 && (
                                <div style={{ marginBottom: '1rem', color: 'var(--success)', fontSize: '1.125rem' }}>
                                    👏 参团率很高，团队核心！
                                </div>
                            )}
                            {parseFloat(stats.csPerMin) >= 6.5 && (
                                <div style={{ marginBottom: '1rem', color: 'var(--success)', fontSize: '1.125rem' }}>
                                    🌟 补刀数优秀，经济领先！
                                </div>
                            )}

                            {parseFloat(stats.kda) < 2.0 && parseFloat(stats.winRate) < 48 && (
                                <div style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                                    💡 建议：关注生存能力，减少阵亡次数可以提升KDA和胜率
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

// Helper function for performance class
const getPerformanceClass = (value, thresholds) => {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.average) return 'average';
    return 'poor';
};

// Helper function for tier color
const getTierColor = (tier) => {
    switch (tier) {
        case '通天代': return '#ff0000'; // Red/Gold
        case '小代': return '#ff4500';   // Orange Red
        case '大腿': return '#ffa500';   // Orange
        case '小腿': return '#ffd700';   // Gold
        case '正常人': return '#ffffff'; // White
        case '小菜': return '#a9a9a9';   // Dark Gray
        case '很菜': return '#808080';   // Gray
        case '答辩': return '#5c4033';   // Brown
        default: return '#ffffff';
    }
};

export default Analysis;
