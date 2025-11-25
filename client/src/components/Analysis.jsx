import React, { useEffect, useState } from 'react';
import { getAdvancedStats } from '../services/api';

const Analysis = ({ summoner }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!summoner) return;

        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await getAdvancedStats();
                setStats(data);
            } catch (e) {
                console.error("Failed to fetch stats", e);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [summoner]);

    if (loading) {
        return (
            <div className="card">
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                    <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    <div className="loading-text" style={{ marginTop: '1rem' }}>分析最近对局数据...</div>
                </div>
            </div>
        );
    }

    if (!stats) return null;

    // Performance rating logic
    const getPerformanceClass = (value, thresholds) => {
        if (value >= thresholds.good) return 'good';
        if (value >= thresholds.average) return 'average';
        return 'poor';
    };

    const kdaClass = getPerformanceClass(parseFloat(stats.kda), { good: 3.0, average: 2.0 });
    const winRateClass = getPerformanceClass(parseFloat(stats.winRate), { good: 55, average: 48 });
    const participationClass = getPerformanceClass(parseFloat(stats.participationRate), { good: 70, average: 60 });
    const csPerMinClass = getPerformanceClass(parseFloat(stats.csPerMin), { good: 6.5, average: 5.0 });

    return (
        <div>
            <div className="card">
                <h2 className="card-title">📊 数据统计 (最近 {stats.gamesAnalyzed} 场)</h2>

                <div className="stats-grid">
                    {/* KDA */}
                    <div className="stat-card">
                        <div className="stat-header">
                            <div className="stat-icon">⚔️</div>
                        </div>
                        <div className="stat-label">平均KDA</div>
                        <div className={`stat-value ${kdaClass}`}>{stats.kda}</div>
                        <div className="stat-subtitle">{stats.avgKills} / {stats.avgDeaths} / {stats.avgAssists}</div>
                    </div>

                    {/* 胜率 */}
                    <div className="stat-card">
                        <div className="stat-header">
                            <div className="stat-icon">🏆</div>
                        </div>
                        <div className="stat-label">胜率</div>
                        <div className={`stat-value ${winRateClass}`}>{stats.winRate}%</div>
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
                        <div className="stat-label">参团率</div>
                        <div className={`stat-value ${participationClass}`}>{stats.participationRate}%</div>
                        <div className="stat-subtitle">团战参与度</div>
                    </div>

                    {/* CS/分钟 */}
                    <div className="stat-card">
                        <div className="stat-header">
                            <div className="stat-icon">🌾</div>
                        </div>
                        <div className="stat-label">每分钟补刀</div>
                        <div className={`stat-value ${csPerMinClass}`}>{stats.csPerMin}</div>
                        <div className="stat-subtitle">CS/Min</div>
                    </div>

                    {/* MVP率 */}
                    <div className="stat-card">
                        <div className="stat-header">
                            <div className="stat-icon">⭐</div>
                        </div>
                        <div className="stat-label">MVP率 (胜局)</div>
                        <div className="stat-value good">{stats.mvpRate}%</div>
                        <div className="stat-subtitle">胜局时队内KDA最高</div>
                    </div>

                    {/* SVP率 */}
                    <div className="stat-card">
                        <div className="stat-header">
                            <div className="stat-icon">💪</div>
                        </div>
                        <div className="stat-label">SVP率 (败局)</div>
                        <div className="stat-value average">{stats.svpRate}%</div>
                        <div className="stat-subtitle">败局时队内KDA最高</div>
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
        </div>
    );
};

export default Analysis;
// Trigger reload
