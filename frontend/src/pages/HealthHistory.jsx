import { useState, useEffect } from 'react'
import TrustTag from '../components/TrustTag'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Download, Filter, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'

const riskBadge = (r) => {
    if (!r) return ''
    const lc = r.toLowerCase()
    if (lc.includes('low')) return 'badge-safe'
    if (lc.includes('high')) return 'badge-danger'
    return 'badge-warning'
}

const riskLabel = (r) => {
    if (!r) return 'Unknown'
    const lc = r.toLowerCase()
    if (lc.includes('low')) return 'Low'
    if (lc.includes('high')) return 'High'
    return 'Moderate'
}

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
                {payload.map(p => {
                    let name = p.name || p.dataKey
                    return (
                        <div key={p.dataKey} style={{ color: p.color }}>
                            {name}: {p.value}
                        </div>
                    )
                })}
            </div>
        )
    }
    return null
}

export default function HealthHistory() {
    const [history, setHistory] = useState([])
    const [trendData, setTrendData] = useState([])
    const [loading, setLoading] = useState(true)
    const [totalAnalyses, setTotalAnalyses] = useState(0)
    const [avgScore, setAvgScore] = useState(null)
    const [trend, setTrend] = useState(null) // 'Improving', 'Declining', 'Stable'

    useEffect(() => {
        async function load() {
            try {
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
                if (!userData.id) { setLoading(false); return }

                const [breathRes, predRes] = await Promise.allSettled([
                    api.breath.getHistory(userData.id),
                    api.prediction.getHistory(userData.id),
                ])

                const breathTests = breathRes.status === 'fulfilled' ? (breathRes.value || []) : []
                const predictions = predRes.status === 'fulfilled' ? (predRes.value || []) : []

                // Build timeline items from breath tests (sorted newest first)
                const timelineItems = breathTests.map((t, i) => {
                    const matchedPred = predictions.find(p =>
                        Math.abs(new Date(p.created_at) - new Date(t.created_at)) < 1000 * 60 * 60 * 24
                    ) || predictions[i] || null
                    const riskScore = matchedPred ? Math.round((matchedPred.final_risk_score ?? 0) * 100) : null
                    const riskCat = matchedPred?.risk_category || matchedPred?.predicted_condition || null
                    const breathScore = Math.round(t.test_accuracy ?? t.lung_capacity ?? 0)
                    return {
                        date: new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        type: 'Breath Test',
                        score: breathScore,
                        risk: riskLabel(riskCat),
                        riskCategory: riskCat,
                    }
                })

                setHistory(timelineItems)
                setTotalAnalyses(breathTests.length)

                // Build trend data (oldest first)
                const combined = [...breathTests].reverse().map((t, i) => {
                    const pred = [...predictions].reverse()[i]
                    const breathScore = Math.round(t.test_accuracy ?? t.lung_capacity ?? 0)
                    const riskScore = pred ? Math.round((pred.final_risk_score ?? 0) * 100) : 0
                    const month = new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    return { month, score: breathScore, risk: riskScore }
                })
                setTrendData(combined)

                // Compute average score & trend
                if (timelineItems.length > 0) {
                    const avg = Math.round(timelineItems.reduce((s, x) => s + x.score, 0) / timelineItems.length)
                    setAvgScore(avg)
                    if (timelineItems.length >= 2) {
                        const first = timelineItems[timelineItems.length - 1].score
                        const last = timelineItems[0].score
                        setTrend(last > first + 3 ? 'Improving' : last < first - 3 ? 'Declining' : 'Stable')
                    }
                }
            } catch (err) {
                console.error('HealthHistory load error:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Long-term Health Tracking</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Health History & Trends</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-outline btn-sm"><Filter size={13} /> Filter</button>
                        <button className="btn btn-outline btn-sm"><Download size={13} /> Export PDF</button>
                    </div>
                </div>
            </div>

            {loading && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <div style={{ fontWeight: 600 }}>Loading health history...</div>
                </div>
            )}

            {!loading && history.length === 0 && (
                <div className="card" style={{ padding: '48px 40px', textAlign: 'center' }}>
                    <Activity size={48} style={{ color: 'var(--color-primary)', display: 'block', margin: '0 auto 20px' }} />
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Health History Yet</div>
                    <div className="text-meta" style={{ maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                        Complete a breath test or health assessment to start building your health history.
                    </div>
                    <Link to="/assessment" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                        Start Assessment
                    </Link>
                </div>
            )}

            {!loading && history.length > 0 && (
                <div className="hh-anchor-row">
                    {/* Medical Timeline ANCHOR */}
                    <div className="card hh-timeline-card" style={{ alignSelf: 'start' }}>
                        <div className="text-card-title" style={{ marginBottom: 20 }}>Analysis Timeline</div>
                        <div className="hh-timeline">
                            {history.map((h, i) => (
                                <div key={i} className="hh-timeline-item">
                                    <div className="hh-timeline-indicator">
                                        <div className="hh-timeline-dot" />
                                        {i < history.length - 1 && <div className="hh-timeline-line" />}
                                    </div>
                                    <div className="hh-timeline-card-content">
                                        <div className="hh-tl-header">
                                            <span style={{ fontWeight: 600, fontSize: 13 }}>{h.type}</span>
                                            <span className={`badge ${riskBadge(h.riskCategory)}`}>{h.risk} Risk</span>
                                        </div>
                                        <div className="hh-tl-score">
                                            Score: <strong>{h.score}</strong>/100
                                        </div>
                                        <div className="hh-tl-meta">
                                            <span className="text-meta">{h.date}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Trend Charts */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="text-card-title" style={{ marginBottom: 16 }}>Breath Quality & Risk Trends</div>
                            <ResponsiveContainer width="100%" height={240}>
                                <LineChart data={trendData} margin={{ top: 4, right: 12, left: -16, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} axisLine={false} tickLine={false} />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-muted)', paddingTop: 12 }} />
                                    <Line type="monotone" dataKey="score" name="Breath Score" stroke="var(--color-primary)" strokeWidth={2.5}
                                        dot={{ fill: 'var(--color-primary)', r: 4, strokeWidth: 0 }} />
                                    <Line type="monotone" dataKey="risk" name="Risk Score" stroke="var(--color-danger)" strokeWidth={2}
                                        strokeDasharray="5 5" dot={{ fill: 'var(--color-danger)', r: 3, strokeWidth: 0 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="card">
                            <div className="text-card-title" style={{ marginBottom: 12 }}>Summary Stats</div>
                            <div className="hh-summary-grid">
                                <div className="hh-summary-item">
                                    <div className="text-meta">Total Analyses</div>
                                    <div style={{ fontSize: 22, fontWeight: 700 }}>{totalAnalyses}</div>
                                </div>
                                <div className="hh-summary-item">
                                    <div className="text-meta">Avg Score</div>
                                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-primary)' }}>{avgScore ?? '–'}</div>
                                </div>
                                <div className="hh-summary-item">
                                    <div className="text-meta">Trend</div>
                                    <div style={{
                                        fontSize: 15, fontWeight: 700,
                                        color: trend === 'Improving' ? 'var(--color-safe)' : trend === 'Declining' ? 'var(--color-danger)' : 'var(--color-warning)'
                                    }}>
                                        {trend === 'Improving' ? '↑ Improving' : trend === 'Declining' ? '↓ Declining' : trend === 'Stable' ? '→ Stable' : '–'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        .hh-anchor-row {
          display: grid;
          grid-template-columns: 340px 1fr;
          gap: var(--sp-md);
          align-items: start;
        }
        .hh-timeline-card { padding: 24px; }
        .hh-timeline {
          display: flex;
          flex-direction: column;
        }
        .hh-timeline-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }
        .hh-timeline-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 4px;
          flex-shrink: 0;
        }
        .hh-timeline-dot {
          width: 10px; height: 10px;
          border-radius: 50%;
          background: var(--color-primary);
          border: 2px solid var(--color-primary-light);
          flex-shrink: 0;
        }
        .hh-timeline-line {
          width: 1px;
          flex: 1;
          min-height: 48px;
          background: var(--color-border);
          margin: 4px 0;
        }
        .hh-timeline-card-content {
          flex: 1;
          padding-bottom: 20px;
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .hh-tl-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }
        .hh-tl-score {
          font-size: 12px;
          color: var(--color-muted);
        }
        .hh-tl-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .hh-summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .hh-summary-item {
          background: var(--color-bg);
          border-radius: var(--radius-sm);
          padding: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        @media (max-width: 900px) {
          .hh-anchor-row { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    )
}
