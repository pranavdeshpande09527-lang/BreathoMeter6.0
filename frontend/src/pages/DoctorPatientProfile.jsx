import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import TrustTag from '../components/TrustTag'
import RiskGauge from '../components/RiskGauge'
import BreathWaveform from '../components/BreathWaveform'
import { ArrowLeft, Loader } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { api } from '../utils/api'

export default function DoctorPatientProfile() {
    const { id } = useParams()
    const [data, setData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function load() {
            try {
                const res = await api.auth.getPatientDetail(id)
                setData(res)
            } catch (err) {
                console.error('Failed to load patient detail:', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    if (loading) {
        return (
            <div className="page-enter" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
                <div style={{ textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Loader size={24} style={{ display: 'block', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 600 }}>Loading patient data...</div>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        )
    }

    const patient = data?.patient || {}
    const hp = data?.health_profile || {}
    const pred = data?.latest_prediction || {}
    const bt = data?.latest_breath_test || {}
    const trend = (data?.prediction_trend || []).reverse().map(t => ({
        date: t.created_at ? new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
        score: Math.round(t.final_risk_score || 0)
    }))

    const patientName = [hp.first_name, hp.last_name].filter(Boolean).join(' ') || patient.email?.split('@')[0] || `Patient ${id?.slice(0, 8)}`
    const riskScore = Math.round(pred.final_risk_score || 50)
    const riskLabel = pred.risk_category || 'Unknown'

    const NOW = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <Link to="/doctor/patients" className="btn btn-ghost btn-sm" style={{ marginBottom: 8, paddingLeft: 0 }}>
                            <ArrowLeft size={14} /> Back to Patients
                        </Link>
                        <div className="text-label">Patient Profile</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>{patientName}</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <TrustTag type="doctor" />
                        <TrustTag type="timed" customLabel={NOW} />
                    </div>
                </div>
            </div>

            {/* Patient info + Risk gauge */}
            <div className="pp-anchor-row">
                {/* Info card */}
                <div className="card">
                    <div className="text-card-title" style={{ marginBottom: 16 }}>Patient Information</div>
                    {[
                        { label: 'Patient ID', value: id?.slice(0, 12) + '...' },
                        { label: 'Email', value: patient.email || '–' },
                        { label: 'Date of Birth', value: hp.date_of_birth || patient.date_of_birth || '–' },
                        { label: 'Blood Group', value: hp.blood_group || '–' },
                        { label: 'Known Conditions', value: hp.known_conditions || 'None reported' },
                    ].map(row => (
                        <div key={row.label} className="pp-info-row">
                            <span className="text-meta">{row.label}</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{row.value}</span>
                        </div>
                    ))}
                </div>

                {/* Risk Gauge */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="text-card-title">Risk Score</div>
                    <RiskGauge score={riskScore} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                        <TrustTag type="ai" />
                        <span className={`badge ${riskLabel === 'High' ? 'badge-danger' : riskLabel === 'Moderate' ? 'badge-warning' : 'badge-safe'}`}>
                            {riskLabel} Risk
                        </span>
                    </div>
                </div>

                {/* Breath Test Metrics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {[
                        { label: 'Lung Capacity', value: bt.lung_capacity ? `${Number(bt.lung_capacity).toFixed(1)}L` : '–', range: '3.0–5.0L', status: bt.lung_capacity && bt.lung_capacity < 2.5 ? 'critical' : 'normal' },
                        { label: 'Breath Duration', value: bt.breath_duration ? `${Number(bt.breath_duration).toFixed(1)}s` : '–', range: '6–8s', status: bt.breath_duration && bt.breath_duration < 4 ? 'low' : 'normal' },
                        { label: 'Breath Strength', value: bt.breath_strength ? `${Math.round(bt.breath_strength)}%` : '–', range: '70–100%', status: bt.breath_strength && bt.breath_strength < 50 ? 'critical' : 'normal' },
                        { label: 'Test Accuracy', value: bt.test_accuracy ? `${Math.round(bt.test_accuracy)}%` : '–', range: '80–100%', status: bt.test_accuracy && bt.test_accuracy < 60 ? 'low' : 'normal' },
                    ].map(m => (
                        <div key={m.label} className="card pp-mini-metric">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span className="text-meta">{m.label}</span>
                                <span className={`badge ${m.status === 'normal' ? 'badge-safe' : m.status === 'low' ? 'badge-warning' : 'badge-danger'}`}>
                                    {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                                </span>
                            </div>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>{m.value}</div>
                            <div className="text-meta">Normal: {m.range}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Risk Explanation */}
            {pred.ai_explanation && (
                <div className="card" style={{ marginTop: 20, borderLeft: '4px solid var(--color-primary)' }}>
                    <div className="text-card-title" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        AI Risk Explanation
                        <TrustTag type="ai" />
                    </div>
                    <div style={{ lineHeight: 1.6, color: 'var(--color-text)', fontSize: 13 }}>
                        {pred.ai_explanation}
                    </div>
                    {pred.top_risk_factors && pred.top_risk_factors.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                            <div className="text-meta" style={{ marginBottom: 6, fontWeight: 600 }}>Top Risk Factors:</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {pred.top_risk_factors.map((f, i) => (
                                    <span key={i} className="badge badge-warning" style={{ fontSize: 11 }}>{f}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Waveform + Trend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 'var(--sp-md)', marginTop: 20 }}>
                <div className="card">
                    <div className="text-card-title" style={{ marginBottom: 8 }}>Latest Breath Waveform</div>
                    <BreathWaveform />
                    <TrustTag type="ai" />
                </div>
                <div className="card">
                    <div className="text-card-title" style={{ marginBottom: 14 }}>Score Trend</div>
                    {trend.length > 1 ? (
                        <ResponsiveContainer width="100%" height={160}>
                            <AreaChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="ptGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.10} />
                                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 6" stroke="var(--color-border)" vertical={false} />
                                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} axisLine={false} tickLine={false} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-subtle)' }} axisLine={false} tickLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="score" stroke="#16A34A" strokeWidth={2.5} fill="url(#ptGrad)"
                                    dot={{ fill: '#16A34A', r: 3.5, strokeWidth: 0 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-muted)', fontSize: 13 }}>
                            Not enough data to display trend
                        </div>
                    )}
                </div>
            </div>

            {/* Doctor notes */}
            <div className="card" style={{ marginTop: 20 }}>
                <div className="text-card-title" style={{ marginBottom: 12 }}>Clinical Notes</div>
                <textarea className="form-input" rows={4} placeholder="Add clinical observations, notes, or action items for this patient..."
                    style={{ resize: 'vertical' }} aria-label="Clinical notes" />
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="btn btn-primary btn-sm">Save Notes</button>
                    <button className="btn btn-outline btn-sm">Request Analysis</button>
                </div>
            </div>

            <style>{`
        .pp-anchor-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr;
          gap: var(--sp-md); align-items: start;
        }
        .pp-info-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 9px 0; border-bottom: 1px solid var(--color-border);
        }
        .pp-info-row:last-child { border-bottom: none; }
        .pp-mini-metric { padding: 14px; }
        @media (max-width:900px) { .pp-anchor-row { grid-template-columns: 1fr; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
        </div>
    )
}
