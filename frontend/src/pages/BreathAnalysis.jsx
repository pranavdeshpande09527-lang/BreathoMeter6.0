import { useState, useEffect } from 'react'
import BreathWaveform from '../components/BreathWaveform'
import TrustTag from '../components/TrustTag'
import { CheckCircle2, Clock, Wind, AlertTriangle, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'
import LungCapacityVisualization from '../components/LungCapacityVisualization'

// Derive spirometry parameter status from test averages
function buildParams(test) {
    if (!test) return []
    return [
        {
            name: 'Breath Hold',
            value: test.lung_capacity != null ? `${test.lung_capacity}` : '--',
            unit: 's',
            range: '≥ 25 s',
            target: 25,
            max: 60,
            status: test.lung_capacity != null ? (test.lung_capacity >= 25 ? 'Normal' : 'Below Normal') : 'No Data',
            tip: 'Breath hold duration reflects lung reserve capacity and diaphragmatic strength.',
            raw: test.lung_capacity
        },
        {
            name: 'Exhalation',
            value: test.breath_duration != null ? `${test.breath_duration}` : '--',
            unit: 's',
            range: '≥ 4 s',
            target: 4,
            max: 15,
            status: test.breath_duration != null ? (test.breath_duration >= 4 ? 'Normal' : 'Below Normal') : 'No Data',
            tip: 'Exhalation duration indicates expiratory flow and airway obstruction risk.',
            raw: test.breath_duration
        },
        {
            name: 'Deep Breath',
            value: test.breath_strength != null ? `${test.breath_strength}` : '--',
            unit: 's',
            range: '≥ 3 s',
            target: 3,
            max: 10,
            status: test.breath_strength != null ? (test.breath_strength >= 3 ? 'Normal' : 'Below Normal') : 'No Data',
            tip: 'Deep breath inhalation time reflects inspiratory muscle strength.',
            raw: test.breath_strength
        },
        test.peak_airflow != null && {
            name: 'Peak Airflow',
            value: test.peak_airflow.toFixed(1),
            unit: 'L/s',
            range: '5.0–8.0 L/s',
            target: 5.0,
            max: 8.0,
            status: test.peak_airflow >= 5.0 ? 'Normal' : 'Below Normal',
            tip: 'Peak expiratory flow measures maximum airflow rate during forceful exhalation.',
            raw: test.peak_airflow
        },
        test.signal_stability != null && {
            name: 'Signal Stability',
            value: `${test.signal_stability}`,
            unit: '%',
            range: '≥ 85%',
            target: 85,
            max: 100,
            status: test.signal_stability >= 85 ? 'Normal' : 'Below Normal',
            tip: 'Signal stability reflects how consistently you performed across multiple test attempts.',
            raw: test.signal_stability
        },
    ].filter(Boolean)
}

function statusBadge(s) {
    if (s === 'Normal') return 'badge-safe'
    if (s === 'Elevated' || s === 'Below Normal') return 'badge-warning'
    if (s === 'No Data') return ''
    return 'badge-danger'
}

// SVG Radial Score Ring
function ScoreRing({ score, status }) {
    const r = 54, cx = 68, cy = 68
    const circumference = 2 * Math.PI * r
    const [animated, setAnimated] = useState(0)
    useEffect(() => {
        const t = setTimeout(() => setAnimated(score), 300)
        return () => clearTimeout(t)
    }, [score])
    const dash = (animated / 100) * circumference
    const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444'
    return (
        <div style={{ position: 'relative', width: 136, height: 136, flexShrink: 0 }}>
            <svg width={136} height={136} viewBox="0 0 136 136">
                {/* Track */}
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-border)" strokeWidth={10} />
                {/* Progress */}
                <circle
                    cx={cx} cy={cy} r={r} fill="none"
                    stroke={color} strokeWidth={10}
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeLinecap="round"
                    transform={`rotate(-90 ${cx} ${cy})`}
                    style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${color}88)` }}
                />
            </svg>
            <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center'
            }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--color-text)', lineHeight: 1 }}>{score}</div>
                <div style={{ fontSize: 10, color: 'var(--color-muted)', fontWeight: 600, marginTop: 2 }}>/ 100</div>
                <div style={{ fontSize: 9, color, fontWeight: 700, marginTop: 4, textAlign: 'center', maxWidth: 60, lineHeight: 1.2 }}>
                    {status}
                </div>
            </div>
        </div>
    )
}

// Animated metric bar
function MetricBar({ param, delay = 0 }) {
    const [width, setWidth] = useState(0)
    const pct = param.raw != null ? Math.min((param.raw / param.max) * 100, 100) : 0
    const isNormal = param.status === 'Normal'
    const targetPct = Math.min((param.target / param.max) * 100, 100)

    useEffect(() => {
        const t = setTimeout(() => setWidth(pct), delay)
        return () => clearTimeout(t)
    }, [pct, delay])

    const barColor = isNormal ? '#22c55e' : '#f59e0b'

    return (
        <div className="ba-metric-row">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="ba-param-name">{param.name}</span>
                    <span title={param.tip} style={{ cursor: 'help', color: 'var(--color-subtle)', display: 'flex' }}>
                        <Info size={12} />
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: 'var(--color-text)' }}>
                        {param.value}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--color-muted)', marginLeft: 2 }}>{param.unit}</span>
                    </span>
                    {param.status !== 'No Data' && (
                        <span className={`badge ${statusBadge(param.status)}`} style={{ fontSize: 10 }}>
                            {param.status === 'Normal' ? <CheckCircle2 size={10} /> : <AlertTriangle size={10} />}
                            {param.status}
                        </span>
                    )}
                </div>
            </div>
            {/* Progress bar */}
            <div style={{ position: 'relative', height: 8, background: 'var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{
                    height: '100%', borderRadius: 8,
                    background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
                    width: `${width}%`,
                    transition: 'width 0.9s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: `0 0 8px ${barColor}66`
                }} />
                {/* Target marker */}
                <div style={{
                    position: 'absolute', top: -2, bottom: -2, width: 2,
                    left: `${targetPct}%`, background: 'var(--color-subtle)',
                    borderRadius: 2
                }} title={`Target: ${param.range}`} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                <span style={{ fontSize: 9, color: 'var(--color-subtle)' }}>0</span>
                <span style={{ fontSize: 9, color: 'var(--color-subtle)' }}>Target: {param.range}</span>
                <span style={{ fontSize: 9, color: 'var(--color-subtle)' }}>{param.max}{param.unit}</span>
            </div>
        </div>
    )
}

// Clinical insights based on data
function ClinicalInsightCard({ params, overallStatus }) {
    if (!params.length) return null
    const belowNormal = params.filter(p => p.status === 'Below Normal')
    const allNormal = belowNormal.length === 0

    return (
        <div className="card" style={{
            marginTop: 0,
            background: allNormal
                ? 'linear-gradient(135deg, rgba(34,197,94,0.06) 0%, rgba(34,197,94,0.02) 100%)'
                : 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(245,158,11,0.02) 100%)',
            border: allNormal ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(245,158,11,0.2)'
        }}>
            <div className="card-header" style={{ marginBottom: 12 }}>
                <div className="text-card-title">🩺 Clinical Insights</div>
                <span className={`badge ${allNormal ? 'badge-safe' : 'badge-warning'}`}>
                    {allNormal ? 'All Clear' : `${belowNormal.length} Area${belowNormal.length > 1 ? 's' : ''} to Review`}
                </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {allNormal ? (
                    <div style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6 }}>
                        ✅ <strong>Excellent respiratory function detected.</strong> All measured parameters are within clinical normal limits.
                        Your airways show good patency, muscular strength, and breathing efficiency.
                        Continue your current lifestyle and re-assess every 30 days.
                    </div>
                ) : (
                    belowNormal.map((p, i) => (
                        <div key={i} style={{
                            padding: '10px 14px',
                            background: 'rgba(245,158,11,0.06)',
                            border: '1px solid rgba(245,158,11,0.15)',
                            borderRadius: 12, fontSize: 13, color: 'var(--color-text)', lineHeight: 1.6
                        }}>
                            <strong style={{ color: '#f59e0b' }}>⚠ {p.name}</strong>: {p.tip}
                            <span style={{ color: 'var(--color-muted)' }}> Measured at {p.value}{p.unit} vs target of {p.range}.</span>
                        </div>
                    ))
                )}
                <div style={{
                    fontSize: 11, color: 'var(--color-subtle)', marginTop: 4,
                    padding: '8px 12px', background: 'var(--color-surface)', borderRadius: 8
                }}>
                    ℹ️ This analysis is AI-assisted and is not a medical diagnosis. Always consult a qualified physician for clinical decisions.
                </div>
            </div>
        </div>
    )
}

export default function BreathAnalysis() {
    const [latestTest, setLatestTest] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        async function loadBreathData() {
            try {
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
                if (!userData.id) {
                    setError('no_user')
                    setLoading(false)
                    return
                }
                const history = await api.breath.getHistory(userData.id)
                if (history && history.length > 0) {
                    setLatestTest(history[0])
                } else {
                    setLatestTest(null)
                }
            } catch (err) {
                console.error('Failed to load breath test:', err)
                setError('fetch_failed')
            } finally {
                setLoading(false)
            }
        }
        loadBreathData()
    }, [])

    const params = buildParams(latestTest)
    const testDate = latestTest?.created_at
        ? new Date(latestTest.created_at).toLocaleString()
        : null
    const normalCount = params.filter(p => p.status === 'Normal').length
    const overallScore = params.length === 0 ? 0 : Math.round((normalCount / params.length) * 100)
    const overallStatus = params.length === 0 ? null : normalCount === params.length ? 'Within Normal Limits' : 'Review Required'

    return (
        <div className="page-enter">
            {/* Page Header */}
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Respiratory Assessment</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Breath Analysis</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <TrustTag type="ai" />
                        {testDate && <TrustTag type="timed" customLabel={testDate} />}
                    </div>
                </div>
            </div>

            {/* PRIMARY ANCHOR — Animated Waveform */}
            <div className="card section">
                <div className="card-header">
                    <div className="text-card-title">Breath Flow Waveform</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {overallStatus && (
                            <span className={`badge ${overallStatus === 'Within Normal Limits' ? 'badge-safe' : 'badge-warning'}`}>
                                <CheckCircle2 size={11} /> {overallStatus}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ marginTop: 8 }}>
                    <BreathWaveform />
                </div>
                <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <TrustTag type="ai" />
                    <TrustTag type="doctor" />
                    {testDate && <span className="trust-tag"><Clock size={11} color="var(--color-muted)" /> {testDate}</span>}
                </div>
            </div>

            {/* 3D Lung + Score Row */}
            <div className="card section" style={{ overflow: 'hidden' }}>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
                    <div style={{ flex: '0 0 auto' }}>
                        <LungCapacityVisualization size={300} healthScore={overallScore} hideUI={true} />
                    </div>
                    <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <div className="text-card-title" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>3D Lung Capacity Model</div>
                            <div className="text-meta">Procedural anatomical model driven by your latest test data.</div>
                        </div>
                        {/* Score Ring + status */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                            <ScoreRing score={overallScore} status={overallStatus || 'No Data'} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ fontSize: 13, color: 'var(--color-text)', fontWeight: 600 }}>Overall Health Score</div>
                                <div className="text-meta" style={{ lineHeight: 1.5 }}>
                                    {normalCount} of {params.length} parameters within normal limits.
                                </div>
                                {params.length > 0 && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {params.map((p, i) => (
                                            <span key={i} className={`badge ${statusBadge(p.status)}`} style={{ fontSize: 10 }}>
                                                {p.name}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', color: 'var(--color-muted)', marginTop: 16 }}>
                    <div style={{ fontWeight: 600 }}>Loading your breath analysis results...</div>
                </div>
            )}

            {/* Fetch error */}
            {!loading && error === 'fetch_failed' && (
                <div className="card" style={{ padding: '32px', textAlign: 'center', border: '1px solid var(--color-danger-muted)', marginTop: 16 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-danger)', marginBottom: 8 }}>Failed to load breath data</div>
                    <div className="text-meta">Please refresh the page or try again later.</div>
                </div>
            )}

            {/* No data */}
            {!loading && !error && !latestTest && (
                <div className="card" style={{ padding: '48px 40px', textAlign: 'center', marginTop: 16 }}>
                    <Wind size={48} style={{ color: 'var(--color-primary)', display: 'block', margin: '0 auto 20px' }} />
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8, color: 'var(--color-text)' }}>No Breath Analysis Recorded Yet</div>
                    <div className="text-meta" style={{ maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                        Complete the breathing performance tests in your health assessment to generate a breath analysis report.
                    </div>
                    <Link to="/assessment" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        Start Assessment
                    </Link>
                </div>
            )}

            {/* Real data — Metrics + Clinical Insights */}
            {!loading && !error && latestTest && (
                <div className="ba-secondary-grid">
                    {/* Left: Animated metric bars */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-header">
                                <div className="text-card-title">Breathing Test Parameters</div>
                                <span className="text-meta" style={{ fontSize: 11 }}>Hover a metric for clinical context</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginTop: 8 }}>
                                {params.map((p, i) => (
                                    <MetricBar key={p.name} param={p} delay={i * 120} />
                                ))}
                            </div>
                        </div>
                        <ClinicalInsightCard params={params} overallStatus={overallStatus} />
                    </div>

                    {/* Right: Status + Summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card ba-status-card">
                            <div style={{ display: 'flex', align: 'center', gap: 10, marginBottom: 12 }}>
                                <CheckCircle2 size={18} color={overallStatus === 'Within Normal Limits' ? 'var(--color-safe)' : 'var(--color-warning)'} />
                                <div className="text-card-title">Analysis Status</div>
                            </div>
                            <div className="ba-status-row">
                                <div className="text-meta">Overall Result</div>
                                <span className={`badge ${overallStatus === 'Within Normal Limits' ? 'badge-safe' : 'badge-warning'}`}>{overallStatus}</span>
                            </div>
                            <div className="ba-status-row">
                                <div className="text-meta">Tests Completed</div>
                                <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                    {[latestTest.lung_capacity, latestTest.breath_duration, latestTest.breath_strength].filter(v => v != null).length} / 3
                                </div>
                            </div>
                            <div className="ba-status-row">
                                <div className="text-meta">Recorded At</div>
                                <div className="text-meta">{testDate}</div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="text-card-title" style={{ marginBottom: 14 }}>Test Score Summary</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                                {[
                                    { label: 'Breath Hold Time', val: latestTest.lung_capacity, unit: 's', target: 25 },
                                    { label: 'Exhalation Time', val: latestTest.breath_duration, unit: 's', target: 4 },
                                    { label: 'Deep Breath Time', val: latestTest.breath_strength, unit: 's', target: 3 },
                                ].map(item => {
                                    const ok = item.val != null && item.val >= item.target
                                    return (
                                        <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)', alignItems: 'center' }}>
                                            <span className="text-meta">{item.label}</span>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <span style={{ fontWeight: 700, fontSize: 15 }}>
                                                    {item.val != null ? item.val : '–'}
                                                    <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--color-muted)', marginLeft: 3 }}>{item.val != null ? item.unit : ''}</span>
                                                </span>
                                                {item.val != null && (
                                                    <span style={{ fontSize: 11, color: ok ? 'var(--color-safe)' : 'var(--color-warning)', fontWeight: 700 }}>
                                                        {ok ? '✓' : `target ≥${item.target}${item.unit}`}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .ba-secondary-grid {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: var(--sp-md);
                    align-items: start;
                    margin-top: 16px;
                }
                @media (max-width: 900px) { .ba-secondary-grid { grid-template-columns: 1fr; } }
                .ba-metric-row { display: flex; flex-direction: column; }
                .ba-param-name { font-weight: 600; color: var(--color-text); font-size: 13px; }
                .ba-status-card { display: flex; flex-direction: column; gap: 0; }
                .ba-status-row {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 9px 0; border-bottom: 1px solid var(--color-border);
                }
                .ba-status-row:last-child { border-bottom: none; padding-bottom: 0; }
            `}</style>
        </div>
    )
}
