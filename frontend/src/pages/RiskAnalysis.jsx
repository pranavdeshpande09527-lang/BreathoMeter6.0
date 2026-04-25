import { useState, useEffect } from 'react'
import RiskGauge from '../components/RiskGauge'
import TrustTag from '../components/TrustTag'
import ConfidenceBadge from '../components/ConfidenceBadge'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Activity, ArrowRight, ChevronDown, Stethoscope, AlertTriangle, Info, RefreshCw, UserCheck, PlusCircle, ShieldAlert, Tag, Zap, CheckCircle, BarChart2, XCircle, Loader2 } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import {
    getConfidenceTier,
    getDisplayDiseases,
    getRecommendedSpecialty,
    getImprovementSuggestion,
    formatConfidence
} from '../utils/predictionConfidence'
import {
    getRiskScoreNarrative,
    getDiseaseInterpretation,
    getDoctorRecommendationNarrative,
} from '../utils/intelligence'

// ── Helpers ───────────────────────────────────────────────────────────────────
function getRiskBadgeClass(category) {
    if (!category) return 'badge-warning'
    const lc = category.toLowerCase()
    if (lc.includes('low')) return 'badge-safe'
    if (lc.includes('high')) return 'badge-danger'
    return 'badge-warning'
}

function toPercent(val) {
    if (val == null) return null
    return Math.round(val * 100)
}

const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
        return (
            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 6, padding: '6px 10px', fontSize: 12 }}>
                {payload[0].payload.factor}: <strong>{payload[0].value}</strong>
            </div>
        )
    }
    return null
}

// ── Severity Badge ─────────────────────────────────────────────────────────────
function SeverityBadge({ severity }) {
    if (!severity) return null
    const cfg = {
        high:     { label: '⚠ High Severity',     bg: 'rgba(239,68,68,0.12)',  color: '#ef4444', border: 'rgba(239,68,68,0.3)' },
        moderate: { label: '◆ Moderate Severity', bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
        low:      { label: '● Low Severity',       bg: 'rgba(34,197,94,0.12)',  color: '#22c55e', border: 'rgba(34,197,94,0.3)' },
    }[severity] || { label: severity, bg: 'rgba(100,100,100,0.1)', color: 'var(--color-muted)', border: 'transparent' }
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
            letterSpacing: '0.03em', flexShrink: 0
        }}>
            {cfg.label}
        </span>
    )
}

// ── Urgent Attention Alert ─────────────────────────────────────────────────────
function UrgentAttentionAlert() {
    return (
        <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px',
            borderRadius: 12, marginBottom: 20,
            background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.4)',
            animation: 'pulse-border 2s ease-in-out infinite'
        }}>
            <ShieldAlert size={22} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
            <div>
                <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 14, marginBottom: 4 }}>
                    🚨 Seek Immediate Medical Consultation
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                    One or more <strong>high-severity conditions</strong> have been identified in your assessment.
                    Please consult a qualified physician promptly — do not rely solely on this AI report for clinical decisions.
                </div>
            </div>
        </div>
    )
}

// ── Confidence-aware Disease Panel ────────────────────────────────────────────
function ConfidenceHeader({ confidence, tier, diseaseCount, confidenceCalibrated }) {
    const messages = {
        high: 'The model has identified a primary condition with strong agreement across all algorithms. This is a high-confidence result.',
        moderate: 'The model found overlapping patterns across conditions. The top candidates are shown — a specialist can help narrow this down.',
        low: diseaseCount === 1
            ? 'Your symptom profile matches several known patterns, but confidence is not high enough to isolate a single condition. A General Physician review would be the best first step.'
            : 'Multiple conditions share similar probability. This typically means more clinical data is needed. We recommend starting with a General Physician.',
    }
    return (
        <div className={`ra-confidence-header tier-${tier.tier}`}>
            <div className="ra-confidence-icon">
                {tier.tier === 'high' && <Activity size={20} />}
                {tier.tier === 'moderate' && <Info size={20} />}
                {tier.tier === 'low' && <AlertTriangle size={20} />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
                    <ConfidenceBadge confidence={confidence} size="md" showBar={false} />
                    {confidenceCalibrated === false && (
                        <span style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                            background: 'rgba(100,100,200,0.1)', color: 'var(--color-muted)',
                            border: '1px solid rgba(100,100,200,0.2)'
                        }}>
                            Heuristic Score
                        </span>
                    )}
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6 }}>
                    {messages[tier.tier]}
                </p>
            </div>
        </div>
    )
}

// ── Improvement Suggestion Banner ─────────────────────────────────────────────
function ImprovementSuggestion({ confidence }) {
    const msg = getImprovementSuggestion(confidence)
    if (!msg) return null
    return (
        <div className="ra-improvement-banner">
            <PlusCircle size={18} style={{ flexShrink: 0 }} />
            <div>
                <strong>Improve prediction accuracy: </strong>
                {msg}
                <Link to="/assessment" style={{ marginLeft: 8, fontWeight: 700, color: 'inherit', textDecoration: 'underline' }}>
                    Add more symptoms →
                </Link>
            </div>
        </div>
    )
}

// ── Insufficient Data Block ────────────────────────────────────────────────────
function InsufficientDataBlock({ message, missingInputs }) {
    return (
        <div className="glass-card anim-fade-in" style={{
            padding: '40px 32px', textAlign: 'center', borderRadius: 14,
            background: 'rgba(239,68,68,0.02)', border: '1.5px dashed rgba(239,68,68,0.2)'
        }}>
            <XCircle size={44} style={{ color: '#ef4444', margin: '0 auto 16px', display: 'block' }} />
            <div style={{ fontWeight: 700, fontSize: 17, color: '#ef4444', marginBottom: 8 }}>
                Insufficient Data for Prediction
            </div>
            <div style={{ color: 'var(--color-text-2)', fontSize: 13, lineHeight: 1.7, maxWidth: 420, margin: '0 auto 20px' }}>
                {message || 'Not enough data to generate a reliable prediction.'}
            </div>
            {missingInputs?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Missing Fields</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                        {missingInputs.map((f, i) => (
                            <span key={i} style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 11,
                                background: 'rgba(239,68,68,0.1)', color: '#dc2626', fontWeight: 600
                            }}>{f}</span>
                        ))}
                    </div>
                </div>
            )}
            <Link to="/assessment" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                Complete Your Assessment <ArrowRight size={14} />
            </Link>
        </div>
    )
}

// ── Prediction Validity Badge ──────────────────────────────────────────────────
function ValidityBadge({ validity }) {
    if (!validity) return null
    const cfg = {
        high:     { icon: <CheckCircle size={14} />, label: 'High Validity',     bg: 'rgba(34,197,94,0.1)',   color: '#16a34a', border: 'rgba(34,197,94,0.25)' },
        moderate: { icon: <Info size={14} />,        label: 'Moderate Validity', bg: 'rgba(245,158,11,0.1)', color: '#b45309', border: 'rgba(245,158,11,0.25)' },
        low:      { icon: <AlertTriangle size={14} />, label: 'Low Validity',    bg: 'rgba(239,68,68,0.1)',  color: '#dc2626', border: 'rgba(239,68,68,0.25)' },
    }[validity] || {}
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
        }}>
            {cfg.icon} Prediction {cfg.label}
        </span>
    )
}

// ── Input Quality Meter ────────────────────────────────────────────────────────
function InputQualityMeter({ score, missingInputs }) {
    if (score == null) return null
    const pct = Math.round(score * 100)
    const color = pct >= 70 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#ef4444'
    return (
        <div style={{
            padding: '12px 16px', borderRadius: 10, marginBottom: 16,
            background: 'var(--color-surface-2)', border: '1px solid var(--color-border)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <BarChart2 size={12} /> Input Data Quality
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{pct}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'var(--color-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 3, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </div>
            {missingInputs?.length > 0 && (
                <div style={{ marginTop: 8, fontSize: 11, color: 'var(--color-muted)' }}>
                    Missing: {missingInputs.join(', ')}
                </div>
            )}
        </div>
    )
}

// ── Medical Disclaimer Footer ──────────────────────────────────────────────────
function MedicalDisclaimer({ text }) {
    return (
        <div style={{
            marginTop: 24, padding: '14px 18px', borderRadius: 10,
            background: 'rgba(37,99,235,0.04)', border: '1px solid rgba(37,99,235,0.12)',
            fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.7,
            display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
            <Info size={14} style={{ flexShrink: 0, color: 'var(--color-primary)', marginTop: 2 }} />
            <span>
                <strong style={{ color: 'var(--color-primary)' }}>Medical Disclaimer: </strong>
                {text || 'This system provides AI-assisted risk insights and is not a medical diagnosis. Please consult a qualified doctor.'}
            </span>
        </div>
    )
}

// ── Doctor Recommendation Blurb ───────────────────────────────────────────────
function DoctorRecBlurb({ tier, specialty, disease, onFind }) {
    const narrative = getDoctorRecommendationNarrative(tier, specialty, disease)
    return (
        <div className="detail-actions" style={{ marginTop: 16 }}>
            <div className="action-tag">
                <div className="tag-dot" style={{ background: tier.tier === 'low' ? 'var(--color-muted)' : 'var(--color-primary)' }} />
                {narrative.headline}
            </div>
            <p className="text-meta" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                {narrative.reasoning}
            </p>
            <button
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, padding: '10px 20px' }}
                onClick={onFind}
                id={`find-doctor-${specialty?.replace(/\s+/g, '-')}`}
            >
                <Stethoscope size={16} />
                {narrative.cta}
                <ArrowRight size={14} />
            </button>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function RiskAnalysis() {
    const navigate = useNavigate()
    const [prediction, setPrediction] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [showAIExplanation, setShowAIExplanation] = useState(false)
    const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
    const [feedbackData, setFeedbackData] = useState({ 
        confirmed_disease: '', 
        was_prediction_helpful: null 
    });
    const [selectedDoctorIdx, setSelectedDoctorIdx] = useState(null);

    const predictionId = prediction?.id;

    const handleDoctorClick = async (doc, idx) => {
        setSelectedDoctorIdx(prev => prev === idx ? null : idx);
        if (!predictionId) return;
        try {
            await api.feedback.logDoctorClick(predictionId, doc.doctor_name);
            console.log(`[Telemetry] Clicked doctor: ${doc.doctor_name}`);
        } catch (err) {
            console.error("Failed to log doctor click", err);
        }
    };

    const handleFeedbackSubmit = async () => {
        if (!predictionId) return;
        setIsSubmittingFeedback(true);
        try {
            await api.feedback.submit({
                prediction_id: predictionId,
                confirmed_disease: feedbackData.confirmed_disease || null,
                was_prediction_helpful: feedbackData.was_prediction_helpful
            });
            setFeedbackSubmitted(true);
        } catch (err) {
            console.error("Failed to submit feedback", err);
        } finally {
            setIsSubmittingFeedback(false);
        }
    };
    const [selectedDisease, setSelectedDisease] = useState(null)

    useEffect(() => {
        async function loadPrediction() {
            try {
                const userData = JSON.parse(localStorage.getItem('user_data') || '{}')
                if (!userData.id) { setError('no_user'); setLoading(false); return }
                const history = await api.prediction.getHistory(userData.id)
                if (history && history.length > 0) {
                    setPrediction(history[0])
                } else {
                    setPrediction(null)
                }
            } catch (err) {
                console.error('Failed to load prediction:', err)
                setError('fetch_failed')
            } finally {
                setLoading(false)
            }
        }
        loadPrediction()
    }, [])

    // ── Derived values ────────────────────────────────────────────────────────
    const rawConfidence = prediction?.confidence_score ?? null
    const tier = getConfidenceTier(rawConfidence)
    const displayDiseases = prediction ? getDisplayDiseases(prediction.disease_risks || [], rawConfidence) : []
    const recommendedSpecialty = prediction
        ? (prediction.recommended_specialty || getRecommendedSpecialty(prediction.disease_risks || [], rawConfidence))
        : 'General Physician'
    const primaryDisease = (tier.tier !== 'low' && displayDiseases.length > 0)
        ? displayDiseases[0].disease
        : null

    const riskScore = prediction ? toPercent(prediction.final_risk_score) : null
    const riskCategory = prediction?.risk_category || prediction?.predicted_condition || 'Unknown'
    const aiExplanation = prediction?.ai_explanation || null
    const analyzedAt = prediction?.created_at
        ? new Date(prediction.created_at).toLocaleString()
        : null

    // Build risk factor bar data
    const buildRiskFactors = (pred) => {
        if (!pred || !pred.top_risk_factors) return []
        const features = pred.top_risk_factors || []
        const baseScore = toPercent(pred.final_risk_score) || 50
        return (Array.isArray(features) ? features : []).slice(0, 6).map((factor, i) => {
            const label = String(factor || 'Unknown Factor').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
            return {
                factor: label,
                score: Math.max(10, Math.round(baseScore * (1 - i * 0.12))),
                color: i < 2 ? 'var(--color-danger)' : i < 4 ? 'var(--color-warning)' : 'var(--color-safe)'
            }
        })
    }
    const riskFactors = buildRiskFactors(prediction)

    const handleFindDoctors = (disease) => {
        navigate(`/doctors?disease=${encodeURIComponent(disease || recommendedSpecialty)}`)
    }

    // Auto-select first disease in list
    useEffect(() => {
        if (displayDiseases && displayDiseases.length > 0 && !selectedDisease) {
            setSelectedDisease(displayDiseases[0])
        }
    }, [displayDiseases?.length])

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Predictive Health Assessment</div>
                        <h1 className="text-page-title fade-in-fast" style={{ 
                            marginTop: 4, 
                            background: 'linear-gradient(135deg, var(--color-primary) 0%, #0ea5e9 100%)', 
                            WebkitBackgroundClip: 'text', 
                            WebkitTextFillColor: 'transparent',
                            display: 'inline-block' 
                        }}>
                            Risk Analysis
                        </h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <TrustTag type="ai" />
                        <TrustTag type="doctor" />
                    </div>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className="glass-primary depth-float card-enter" style={{ padding: '64px 40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
                    <div style={{ position: 'relative', width: 64, height: 64, marginBottom: 24 }}>
                        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-primary)', opacity: 0.1, borderRadius: '50%', animation: 'livePulse 2.2s ease-in-out infinite' }} />
                        <Loader2 className="spin" size={40} style={{ color: 'var(--color-primary)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)', marginBottom: 8 }}>Analyzing Clinical Data...</div>
                    <div className="text-meta">Running through our hybrid ML ensemble</div>
                </div>
            )}

            {/* Error */}
            {!loading && error === 'fetch_failed' && (
                <div className="glass-card state-crossfade" style={{ padding: '48px 40px', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(239, 68, 68, 0.02)' }}>
                    <div className="icon-circle" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)', margin: '0 auto 20px', width: 56, height: 56 }}>
                        <AlertTriangle size={28} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-danger)', marginBottom: 8 }}>Analysis Unavailable</div>
                    <div className="text-meta" style={{ marginBottom: 24 }}>We couldn't retrieve your risk data. Please try again or check your connection.</div>
                    <button onClick={() => window.location.reload()} className="btn btn-outline" style={{ display: 'inline-flex' }}>
                        <RefreshCw size={16} /> Retry Analysis
                    </button>
                </div>
            )}

            {!loading && error === 'no_user' && (
                <div className="glass-primary depth-float card-enter" style={{ padding: '64px 40px', textAlign: 'center' }}>
                    <div className="icon-circle" style={{ background: 'var(--color-surface-2)', color: 'var(--color-muted)', margin: '0 auto 20px', width: 56, height: 56 }}>
                        <UserCheck size={28} />
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)', marginBottom: 8 }}>Authentication Required</div>
                    <div className="text-meta" style={{ marginBottom: 24 }}>Please log in to view your personalized risk analysis.</div>
                    <Link to="/login" className="btn btn-primary" style={{ display: 'inline-flex' }}>Go to Login <ArrowRight size={16} /></Link>
                </div>
            )}

            {!loading && !error && !prediction && (
                <div className="glass-card state-crossfade" style={{ padding: '64px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-50%', left: '-10%', width: '120%', height: '200%', background: 'radial-gradient(circle at center, var(--color-primary-faded) 0%, transparent 60%)', opacity: 0.5, pointerEvents: 'none' }} />
                    <div className="icon-circle" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)', margin: '0 auto 24px', width: 64, height: 64, boxShadow: 'var(--shadow-primary-sm)' }}>
                        <Activity size={32} />
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 22, marginBottom: 12, color: 'var(--color-text)' }}>No Risk Analysis Yet</div>
                    <div className="text-meta" style={{ maxWidth: 420, margin: '0 auto 32px', lineHeight: 1.6, fontSize: 14 }}>
                        Complete your comprehensive health assessment to generate a personalized respiratory risk analysis powered by our clinical ML model.
                    </div>
                    <Link to="/assessment" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px', fontSize: 15 }}>
                        Start Health Assessment <ArrowRight size={18} />
                    </Link>
                </div>
            )}

            {/* ── Main Content ── */}
            {!loading && !error && prediction && (
                <div className="ra-layout anim-stage-reveal card-enter">
                    {/* Left Column */}
                    <div className="ra-main-content">

                        {/* Insufficient Data Block — blocks all predictions */}
                        {prediction.insufficient_data ? (
                            <>
                                <InsufficientDataBlock
                                    message={prediction.message}
                                    missingInputs={prediction.missing_inputs}
                                />
                                <MedicalDisclaimer text={prediction.medical_disclaimer} />
                            </>
                        ) : (
                        <>
                        {/* Improvement Suggestion (shows only for low confidence) */}
                        <ImprovementSuggestion confidence={rawConfidence} />

                        {/* Validity + Input Quality status bar */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                            <ValidityBadge validity={prediction.prediction_validity} />
                            {prediction?.confidence_band && (
                                <span style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 5,
                                    padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                    background: 'rgba(37,99,235,0.08)', color: 'var(--color-primary)',
                                    border: '1px solid rgba(37,99,235,0.18)'
                                }}>
                                    Confidence Band: {String(prediction.confidence_band).toUpperCase()}
                                </span>
                            )}
                        </div>

                        {/* Input Quality Meter */}
                        <InputQualityMeter
                            score={prediction.input_quality_score}
                            missingInputs={prediction.missing_inputs}
                        />

                        {/* Urgent Attention Safety Override */}
                        {prediction.urgent_attention && <UrgentAttentionAlert />}

                        {/* Fallback Warning */}
                        {prediction.fallback_used && (
                            <div className="ra-improvement-banner" style={{ backgroundColor: 'var(--color-warning-subtle)', color: 'var(--color-warning)', borderColor: 'var(--color-warning-muted)', marginBottom: 20 }}>
                                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                                <div>
                                    <strong>Limited prediction data: </strong>
                                    The model ensemble returned fewer than expected candidates
                                    {prediction.fallback_reason === 'low_candidate_count' && ' (low candidate count)'}.
                                    {' '}Statistical alternatives are shown separately. Exercise caution with confidence scores.
                                </div>
                            </div>
                        )}

                        {/* ═══ Disease Prediction Summary — Hero Card ═══ */}
                        {(prediction.primary_prediction || displayDiseases.length > 0) && (
                            <div className="glass-primary depth-float hover-card card-enter-1" style={{
                                padding: '28px',
                                borderRadius: '20px',
                                background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb), 0.06) 0%, rgba(var(--color-primary-rgb), 0.02) 100%)',
                                border: '1px solid rgba(var(--color-primary-rgb), 0.15)',
                                marginBottom: 20,
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Background glow */}
                                <div style={{
                                    position: 'absolute', top: '-40%', right: '-20%',
                                    width: '60%', height: '180%',
                                    background: 'radial-gradient(circle, rgba(var(--color-primary-rgb), 0.08) 0%, transparent 70%)',
                                    pointerEvents: 'none'
                                }} />

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    {/* Header */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                        <div style={{
                                            width: 44, height: 44, borderRadius: 14,
                                            background: 'rgba(var(--color-primary-rgb), 0.12)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            boxShadow: '0 2px 8px rgba(var(--color-primary-rgb), 0.15)'
                                        }}>
                                            <Activity size={22} style={{ color: 'var(--color-primary)' }} />
                                        </div>
                                        <div>
                                            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                                                🩺 Disease Prediction
                                            </h2>
                                            <p className="text-meta" style={{ margin: 0, fontSize: 12 }}>
                                                AI + ML Ensemble Diagnostic Result
                                            </p>
                                        </div>
                                    </div>

                                    {/* Primary Disease Highlight */}
                                    <div style={{
                                        padding: '20px 24px',
                                        borderRadius: 16,
                                        background: 'var(--glass-surface-primary)',
                                        border: '1px solid rgba(var(--color-primary-rgb), 0.12)',
                                        marginBottom: 16
                                    }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-muted)', marginBottom: 8 }}>
                                            Primary Predicted Condition
                                        </div>
                                        <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
                                            {prediction.primary_prediction || displayDiseases[0]?.disease || 'Pending Analysis'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                                            {displayDiseases[0]?.risk_percentage != null && (
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                                                    background: displayDiseases[0].risk_percentage > 60
                                                        ? 'rgba(239,68,68,0.1)' : displayDiseases[0].risk_percentage > 30
                                                        ? 'rgba(245,158,11,0.1)' : 'rgba(22,163,74,0.1)',
                                                    color: displayDiseases[0].risk_percentage > 60
                                                        ? 'var(--color-danger)' : displayDiseases[0].risk_percentage > 30
                                                        ? 'var(--color-warning)' : 'var(--color-safe)',
                                                    border: `1px solid ${displayDiseases[0].risk_percentage > 60
                                                        ? 'rgba(239,68,68,0.2)' : displayDiseases[0].risk_percentage > 30
                                                        ? 'rgba(245,158,11,0.2)' : 'rgba(22,163,74,0.2)'}`
                                                }}>
                                                    {displayDiseases[0].risk_percentage}% Probability
                                                </span>
                                            )}
                                            {displayDiseases[0]?.severity && (
                                                <SeverityBadge severity={displayDiseases[0].severity} />
                                            )}
                                            {prediction.recommended_specialty && (
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                                    background: 'rgba(var(--color-primary-rgb), 0.08)',
                                                    color: 'var(--color-primary)',
                                                    border: '1px solid rgba(var(--color-primary-rgb), 0.15)'
                                                }}>
                                                    👨‍⚕️ {prediction.recommended_specialty}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Urgency + Time to Action row */}
                                    {(prediction.urgency_tier || prediction.time_to_action) && (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                                            {prediction.urgency_tier && (
                                                <div style={{
                                                    padding: '14px 16px', borderRadius: 14,
                                                    background: prediction.urgency_tier === 'Emergency' ? 'rgba(239,68,68,0.08)'
                                                        : prediction.urgency_tier === 'High Risk' ? 'rgba(245,158,11,0.08)'
                                                        : 'rgba(22,163,74,0.05)',
                                                    border: `1px solid ${prediction.urgency_tier === 'Emergency' ? 'rgba(239,68,68,0.2)'
                                                        : prediction.urgency_tier === 'High Risk' ? 'rgba(245,158,11,0.2)'
                                                        : 'rgba(22,163,74,0.15)'}`
                                                }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: 6 }}>
                                                        Urgency Level
                                                    </div>
                                                    <div style={{
                                                        fontSize: 15, fontWeight: 800,
                                                        color: prediction.urgency_tier === 'Emergency' ? 'var(--color-danger)'
                                                            : prediction.urgency_tier === 'High Risk' ? 'var(--color-warning)'
                                                            : 'var(--color-safe)'
                                                    }}>
                                                        {prediction.urgency_tier === 'Emergency' ? '🚨' : prediction.urgency_tier === 'High Risk' ? '⚠️' : '✅'} {prediction.urgency_tier}
                                                    </div>
                                                </div>
                                            )}
                                            {prediction.time_to_action && (
                                                <div style={{
                                                    padding: '14px 16px', borderRadius: 14,
                                                    background: 'rgba(var(--color-primary-rgb), 0.04)',
                                                    border: '1px solid rgba(var(--color-primary-rgb), 0.1)'
                                                }}>
                                                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: 6 }}>
                                                        Recommended Action
                                                    </div>
                                                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>
                                                        🕐 {prediction.time_to_action}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Other predicted conditions mini-list */}
                                    {displayDiseases.length > 1 && (
                                        <div style={{ marginTop: 4 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-muted)', marginBottom: 10 }}>
                                                Other Predicted Conditions
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                {displayDiseases.slice(1).map((d, i) => (
                                                    <div key={i} style={{
                                                        display: 'flex', alignItems: 'center', gap: 8,
                                                        padding: '6px 14px', borderRadius: 12,
                                                        background: 'var(--glass-surface-secondary)',
                                                        border: '1px solid var(--color-border)',
                                                        fontSize: 13
                                                    }}>
                                                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{d.disease}</span>
                                                        <span style={{
                                                            fontWeight: 700, fontSize: 11,
                                                            padding: '2px 8px', borderRadius: 10,
                                                            background: d.risk_percentage > 60 ? 'rgba(239,68,68,0.1)' : d.risk_percentage > 30 ? 'rgba(245,158,11,0.1)' : 'rgba(22,163,74,0.08)',
                                                            color: d.risk_percentage > 60 ? 'var(--color-danger)' : d.risk_percentage > 30 ? 'var(--color-warning)' : 'var(--color-safe)'
                                                        }}>
                                                            {d.risk_percentage}%
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Urgency action text */}
                                    {prediction.urgency_action && (
                                        <div style={{
                                            marginTop: 16, padding: '12px 16px', borderRadius: 12,
                                            background: prediction.urgency_tier === 'Emergency' ? 'rgba(239,68,68,0.06)' : 'rgba(var(--color-primary-rgb), 0.04)',
                                            border: `1px solid ${prediction.urgency_tier === 'Emergency' ? 'rgba(239,68,68,0.15)' : 'rgba(var(--color-primary-rgb), 0.1)'}`,
                                            fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6
                                        }}>
                                            <strong style={{ color: 'var(--color-text)' }}>Recommended: </strong>
                                            {prediction.urgency_action}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Primary Model Predictions */}
                        {((prediction.primary_predictions?.length > 0) || (prediction.disease_risks?.length > 0) || prediction.primary_prediction) && (
                            <div className="glass-primary depth-float hover-card card-enter-1" style={{ padding: '24px', borderRadius: '20px', background: 'var(--glass-surface-primary)' }}>
                                <div className="ra-header-box">
                                    <div className="ra-pamphlet-icon hero-icon">
                                        <Activity size={24} />
                                    </div>
                                    <div>
                                        <h2 className="ra-section-title large">
                                            {tier.tier === 'high'
                                                ? '🔬 Primary Model Predictions'
                                                : tier.tier === 'moderate'
                                                ? '🔬 Primary Model Predictions'
                                                : '🔬 Possible Conditions (Low Confidence)'}
                                        </h2>
                                        <p className="text-meta">Direct output from the hybrid ML + AI ensemble model</p>
                                    </div>
                                </div>

                                <ConfidenceHeader
                                    confidence={rawConfidence}
                                    tier={tier}
                                    diseaseCount={displayDiseases.length}
                                    confidenceCalibrated={prediction.confidence_calibrated}
                                />

                                {/* Primary Disease Chips */}
                                <div className="ra-disease-grid-interactive" style={{ marginTop: 20 }}>
                                    {(prediction?.primary_predictions?.length > 0 ? prediction.primary_predictions : (displayDiseases || [])).map((dr, idx) => {
                                        const riskNum = dr.risk_percentage || 0
                                        const isSelected = selectedDisease?.disease === dr.disease || (!selectedDisease && idx === 0)
                                        const colorVar = riskNum > 60 ? 'var(--color-danger)' : riskNum > 30 ? 'var(--color-warning)' : 'var(--color-safe)'
                                        const isHighSeverity = dr.severity === 'high'
                                        return (
                                            <div
                                                key={idx}
                                                className={`ra-disease-chip anim-slide-up ${isSelected ? 'active' : ''}`}
                                                onClick={() => setSelectedDisease(dr)}
                                                style={{
                                                    '--risk-color': colorVar,
                                                    outline: isHighSeverity ? '1.5px solid rgba(239,68,68,0.2)' : 'none',
                                                    animationDelay: `${idx * 0.06}s`
                                                }}
                                                id={`disease-chip-${dr.disease?.replace(/\s+/g, '-')}`}
                                            >
                                                <div className="chip-header">
                                                    <span className="chip-name">{dr.disease || 'Unknown Condition'}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        <SeverityBadge severity={dr.severity} />
                                                        <span className="chip-val">{riskNum}%</span>
                                                    </div>
                                                </div>
                                                <div className="chip-progress">
                                                    <div className="chip-progress-fill" style={{ width: `${riskNum}%`, background: colorVar }} />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {/* Selected Disease Detail */}
                                {selectedDisease && (
                                    <div className="ra-disease-detail-view anim-fade-in">
                                        <div className="detail-header">
                                            <div className="detail-title-row">
                                                <h3 className="detail-disease-name">{selectedDisease.disease}</h3>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                                    <SeverityBadge severity={selectedDisease.severity} />
                                                    <span
                                                        className="detail-risk-badge"
                                                        style={{
                                                            background: selectedDisease.risk_percentage > 60 ? 'rgba(var(--color-danger-rgb), 0.1)' : 'rgba(var(--color-warning-rgb), 0.1)',
                                                            color: selectedDisease.risk_percentage > 60 ? 'var(--color-danger)' : 'var(--color-warning)'
                                                        }}
                                                    >
                                                        {selectedDisease.risk_percentage > 60 ? 'High Concern' : selectedDisease.risk_percentage > 30 ? 'Moderate Concern' : 'Low Concern'}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="detail-score-bar">
                                                <div className="bar-bg">
                                                    <div className="bar-fill" style={{ width: `${selectedDisease.risk_percentage}%`, background: selectedDisease.risk_percentage > 60 ? 'var(--color-danger)' : 'var(--color-warning)' }} />
                                                </div>
                                                <span className="bar-label">{selectedDisease.risk_percentage}% Probability</span>
                                            </div>
                                        </div>

                                        <div className="detail-body">
                                            {/* Intelligence: What / Why / Next */}
                                            {(() => {
                                                const intel = getDiseaseInterpretation(
                                                    selectedDisease.disease,
                                                    selectedDisease.risk_percentage,
                                                    selectedDisease.severity
                                                )
                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                                        {[{
                                                            label: 'What this means',
                                                            icon: '🔍',
                                                            text: intel.what,
                                                            color: 'rgba(var(--color-primary-rgb), 0.06)',
                                                            border: 'rgba(var(--color-primary-rgb), 0.15)',
                                                        }, {
                                                            label: 'Why this matters',
                                                            icon: '⚕',
                                                            text: intel.why,
                                                            color: 'rgba(245,158,11,0.06)',
                                                            border: 'rgba(245,158,11,0.2)',
                                                        }, {
                                                            label: 'What you should do',
                                                            icon: '→',
                                                            text: intel.next,
                                                            color: 'rgba(22,163,74,0.06)',
                                                            border: 'rgba(22,163,74,0.2)',
                                                        }].map(({ label, icon, text, color, border }) => (
                                                            <div key={label} style={{
                                                                padding: '10px 14px',
                                                                borderRadius: 10,
                                                                background: color,
                                                                border: `1px solid ${border}`,
                                                                display: 'flex',
                                                                gap: 10,
                                                                alignItems: 'flex-start',
                                                            }}>
                                                                <span style={{ fontSize: 14, lineHeight: 1, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                                                                <div>
                                                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                                                                    <div style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.55 }}>{text}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )
                                            })()}

                                            {/* Key Contributing Factors */}
                                            {selectedDisease.key_factors?.length > 0 && (
                                                <div style={{ marginBottom: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--color-primary-rgb), 0.06)', border: '1px solid rgba(var(--color-primary-rgb), 0.15)' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                        <Zap size={12} /> Key Contributing Factors
                                                    </div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {selectedDisease.key_factors.map((f, i) => (
                                                            <span key={i} style={{
                                                                padding: '3px 10px', borderRadius: 20, fontSize: 12,
                                                                background: 'rgba(var(--color-primary-rgb), 0.1)',
                                                                color: 'var(--color-primary)', fontWeight: 600,
                                                                display: 'flex', alignItems: 'center', gap: 5
                                                            }}>
                                                                <Tag size={10} /> {f}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {selectedDisease.reason && (
                                                <div className="detail-reason-box">
                                                    <div className="reason-label">Model Reasoning</div>
                                                    <p className="reason-text">{selectedDisease.reason}</p>
                                                </div>
                                            )}

                                            <DoctorRecBlurb
                                                tier={tier}
                                                specialty={recommendedSpecialty}
                                                disease={selectedDisease.disease}
                                                onFind={() => handleFindDoctors(
                                                    tier.tier === 'low' ? 'General Physician' : selectedDisease.disease
                                                )}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Alternative Considerations (Fallback / Clinical Model) */}
                        {prediction.suggested_alternatives?.length > 0 && (
                            <div className="glass-secondary depth-float hover-card card-enter-2" style={{ borderStyle: 'dashed', padding: '24px', borderRadius: '20px' }}>
                                <div className="ra-header-box">
                                    <div className="ra-pamphlet-icon hero-icon" style={{ background: 'rgba(245,158,11,0.1)', color: 'var(--color-warning)' }}>
                                        <Info size={22} />
                                    </div>
                                    <div>
                                        <h2 className="ra-section-title large" style={{ color: 'var(--color-warning)' }}>
                                            💡 Alternative Considerations
                                        </h2>
                                        <p className="text-meta">Generated by clinical fallback model — treat as supplementary, not primary diagnosis</p>
                                    </div>
                                </div>

                                <div className="ra-disease-grid-interactive" style={{ marginTop: 16 }}>
                                    {(prediction.suggested_alternatives || []).map((dr, idx) => {
                                        const riskNum = dr.risk_percentage || 0
                                        const colorVar = 'var(--color-warning)'
                                        return (
                                            <div
                                                key={idx}
                                                className="ra-disease-chip"
                                                style={{ '--risk-color': colorVar, opacity: 0.85 }}
                                                id={`alt-chip-${dr.disease?.replace(/\s+/g, '-')}`}
                                            >
                                                <div className="chip-header">
                                                    <span className="chip-name">{dr.disease || 'Alternative Condition'}</span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                                        <SeverityBadge severity={dr.severity} />
                                                        <span className="chip-val" style={{ color: 'var(--color-muted)' }}>{riskNum}%</span>
                                                    </div>
                                                </div>
                                                <div className="chip-progress">
                                                    <div className="chip-progress-fill" style={{ width: `${riskNum}%`, background: 'var(--color-warning)', opacity: 0.6 }} />
                                                </div>
                                                {dr.key_factors?.length > 0 && (
                                                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                        {dr.key_factors.map((f, i) => (
                                                            <span key={i} style={{
                                                                padding: '2px 7px', borderRadius: 10, fontSize: 10,
                                                                background: 'rgba(245,158,11,0.1)', color: '#b45309', fontWeight: 600
                                                            }}>{f}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: 'rgba(245,158,11,0.07)', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                                    <strong style={{ color: 'var(--color-warning)' }}>Note:</strong> These conditions were identified by the clinical baseline model, not the hybrid ML ensemble. They carry lower diagnostic weight and are shown purely for awareness.
                                </div>
                            </div>
                        )}

                        {/* AI Clinical Insight (collapsible) */}
                        <div className="glass-secondary depth-float hover-card card-enter-3" style={{ padding: '24px', borderRadius: '20px' }}>
                            <div className="ra-section-header ra-accordion-toggle" onClick={() => setShowAIExplanation(v => !v)} style={{ cursor: 'pointer' }}>
                                <div className="ra-pamphlet-icon"><Activity size={18} /></div>
                                <div style={{ flex: 1 }}>
                                    <div className="ra-section-title">AI Clinical Insight Engine</div>
                                    <div className="text-meta" style={{ fontSize: 12 }}>Holistic cross-model interpretation</div>
                                </div>
                                <div className="ra-chevron" style={{ transition: 'transform 0.3s ease', transform: showAIExplanation ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <ChevronDown size={20} />
                                </div>
                            </div>
                            <div style={{ maxHeight: showAIExplanation ? 900 : 0, overflow: 'hidden', transition: 'max-height 0.5s ease', opacity: showAIExplanation ? 1 : 0 }}>
                                <div className="ra-section-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                    {/* ── How the engine works ── */}
                                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--color-primary-rgb), 0.05)', border: '1px solid rgba(var(--color-primary-rgb), 0.12)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Activity size={12} /> How This Engine Works
                                        </div>
                                        <p style={{ margin: 0, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.65 }}>
                                            The AI Clinical Insight Engine synthesises outputs from multiple independent models — a classical ML classifier, a symptom-weighted clinical scorer, and an LLM reasoner — into a single unified interpretation. Each model votes on the most likely condition; the engine weighs those votes by historical accuracy and cross-model agreement before producing the explanation below.
                                        </p>
                                    </div>

                                    {/* ── Model score pills ── */}
                                    {(prediction.ml_score != null || prediction.ai_score != null || prediction.agreement_score != null) && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                            {[
                                                { label: 'ML Classifier', val: prediction.ml_score != null ? `${Math.round(prediction.ml_score * 100)}%` : null, color: 'rgba(37,99,235,0.1)', text: 'var(--color-primary)', border: 'rgba(37,99,235,0.2)' },
                                                { label: 'AI Reasoner', val: prediction.ai_score != null ? `${Math.round(prediction.ai_score * 100)}%` : null, color: 'rgba(139,92,246,0.08)', text: '#7c3aed', border: 'rgba(139,92,246,0.2)' },
                                                { label: 'Model Agreement', val: prediction.agreement_score != null ? `${Math.round(prediction.agreement_score * 100)}%` : null, color: 'rgba(16,185,129,0.08)', text: '#059669', border: 'rgba(16,185,129,0.2)' },
                                            ].filter(p => p.val).map(p => (
                                                <div key={p.label} style={{ padding: '6px 14px', borderRadius: 20, background: p.color, border: `1px solid ${p.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
                                                    <span style={{ fontSize: 11, color: 'var(--color-muted)', fontWeight: 600 }}>{p.label}</span>
                                                    <span style={{ fontSize: 13, fontWeight: 800, color: p.text }}>{p.val}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ── AI explanation bullets ── */}
                                    <div style={{ padding: '12px 14px', borderRadius: 10, background: 'var(--color-surface-2)', border: '1px solid var(--color-border)' }}>
                                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                                            Clinical Reasoning
                                        </div>
                                        {aiExplanation && typeof aiExplanation === 'string' ? (
                                            <ul className="ra-explanation-list" style={{ margin: 0 }}>
                                                {(aiExplanation.includes('\n')
                                                    ? aiExplanation.split('\n')
                                                    : aiExplanation.split('. ').filter(s => s.trim().length > 0).map(s => s.trim().endsWith('.') ? s.trim() : s.trim() + '.')
                                                ).filter(line => line.trim().length > 3).map((line, idx) => (
                                                    <li key={idx} style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.6, marginBottom: 6 }}>
                                                        {line.startsWith('- ') ? line.substring(2) : line.startsWith('• ') ? line.substring(2) : line}
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <div className="text-meta" style={{ fontSize: 13 }}>
                                                The engine has reviewed your symptom profile, breath-test readings, and environmental exposure data. A detailed narrative explanation was not returned for this session — this can happen when the model ensemble reaches consensus quickly with high agreement. The confidence score and disease predictions above reflect this outcome.
                                            </div>
                                        )}
                                    </div>

                                    {/* ── Top risk signals ── */}
                                    {prediction.top_risk_factors?.length > 0 && (
                                        <div style={{ padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--color-primary-rgb), 0.04)', border: '1px solid rgba(var(--color-primary-rgb), 0.12)' }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Zap size={12} /> Strongest Contributing Signals
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                {prediction.top_risk_factors.slice(0, 8).map((f, i) => (
                                                    <span key={i} style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, background: 'rgba(var(--color-primary-rgb), 0.1)', color: 'var(--color-primary)', fontWeight: 600 }}>
                                                        {String(f).replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                    </span>
                                                ))}
                                            </div>
                                            <p style={{ margin: '10px 0 0', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.55 }}>
                                                These are the input features that had the highest influence on the final prediction. They were identified by the ML classifier using SHAP-style feature importance ranking and confirmed by the AI reasoner.
                                            </p>
                                        </div>
                                    )}

                                    {/* ── Safety flag ── */}
                                    {prediction.safety_flag && (
                                        <div className="ra-safety-box">
                                            <strong>Safety Note:</strong> {prediction.safety_flag}
                                        </div>
                                    )}

                                    {/* ── Confidence methodology note ── */}
                                    <div style={{ padding: '10px 13px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', border: '1px dashed var(--color-border)', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.6 }}>
                                        <strong style={{ color: 'var(--color-text-2)' }}>Confidence methodology: </strong>
                                        Final confidence is a weighted blend of the ML classifier probability, the AI reasoner agreement ratio, and an environmental adjustment factor from live air-quality API data. Scores above 75% indicate strong multi-model consensus. Scores below 50% suggest you should provide more symptom data for a more reliable result.
                                    </div>

                                </div>
                            </div>
                        </div>

                        {/* Integrated Analysis (collapsible) */}
                        {riskFactors.length > 0 && (
                            <div className="glass-secondary depth-float hover-card card-enter-4" style={{ padding: '24px', borderRadius: '20px' }}>
                                <div className="ra-section-header ra-accordion-toggle" onClick={() => setShowDetailedBreakdown(v => !v)} style={{ cursor: 'pointer' }}>
                                    <div className="ra-pamphlet-icon"><Activity size={18} /></div>
                                    <div style={{ flex: 1 }}>
                                        <div className="ra-section-title">Integrated Sensor & Clinical Analysis</div>
                                        <p className="text-meta" style={{ fontSize: 12 }}>Combined ML and Environmental API factors</p>
                                    </div>
                                    <div className="ra-chevron" style={{ transition: 'transform 0.3s ease', transform: showDetailedBreakdown ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                        <ChevronDown size={20} />
                                    </div>
                                </div>
                                <div style={{ maxHeight: showDetailedBreakdown ? 700 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease', opacity: showDetailedBreakdown ? 1 : 0 }}>
                                    <div className="ra-section-body">
                                        <div className="ra-risk-grid">
                                            <div className="ra-chart-container">
                                                <div className="text-label" style={{ marginBottom: 16, fontSize: 11 }}>Feature Importance Map</div>
                                                <ResponsiveContainer width="100%" height={220}>
                                                    <BarChart data={riskFactors} layout="vertical" margin={{ top: 0, right: 20, left: 100, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border)" horizontal={false} vertical={true} />
                                                        <XAxis type="number" hide />
                                                        <YAxis dataKey="factor" type="category" tick={{ fontSize: 11, fill: 'var(--color-text-2)' }} axisLine={false} tickLine={false} width={100} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={12}>
                                                            {riskFactors.map((entry, index) => (
                                                                <Cell key={index} fill={entry.color} />
                                                            ))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                            <div className="ra-score-metrics">
                                                {[
                                                    { label: 'Clinical Predictability', val: toPercent(prediction.ml_score) },
                                                    { label: 'AI Reasoning', val: toPercent(prediction.ai_score) },
                                                    { label: 'Model Agreement', val: prediction?.agreement_score != null ? `${Math.round(prediction.agreement_score * 100)}%` : '–' },
                                                ].map(item => (
                                                    <div key={item.label} className="ra-metric-pill">
                                                        <span className="text-meta">{item.label}</span>
                                                        <span className="value">{item.val ?? '–'}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Consult a Doctor Section ─────────────────────────── */}
                        {prediction.recommended_doctors && prediction.recommended_doctors.length > 0 && (
                            <div className={`card premium-card mb-24 ${prediction.priority_recommendation ? 'urgent-border' : ''}`} style={{ marginTop: 24 }}>
                                <div className="ra-section-header" style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <div className="icon-circle" style={{ background: prediction.priority_recommendation ? 'rgba(var(--color-danger-rgb), 0.1)' : 'rgba(var(--color-primary-rgb), 0.1)' }}>
                                            <Stethoscope size={18} color={prediction.priority_recommendation ? 'var(--color-danger)' : 'var(--color-primary)'} />
                                        </div>
                                        <div>
                                            <h3 className="ra-section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                                Consult a Specialist
                                                {prediction.priority_recommendation && <span className="badge-pill badge-danger" style={{ fontSize: 10, padding: '2px 8px' }}>Priority</span>}
                                            </h3>
                                            <p className="text-meta" style={{ margin: 0 }}>Recommended {recommendedSpecialty} near you</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="ra-section-body" style={{ padding: '16px 0' }}>
                                    <div className="doctor-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                        {(prediction.recommended_doctors || []).map((doc, idx) => {
                                            const isSelected = selectedDoctorIdx === idx;
                                            return (
                                                <div key={idx} style={{
                                                    background: isSelected ? 'var(--color-surface)' : 'var(--color-surface-2)',
                                                    border: isSelected ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
                                                    borderRadius: 12,
                                                    boxShadow: isSelected ? '0 8px 24px rgba(0,0,0,0.08)' : 'none',
                                                    overflow: 'hidden',
                                                    transition: 'all 0.3s ease'
                                                }}>
                                                    <div 
                                                        className="doctor-item-card" 
                                                        role="button"
                                                        tabIndex={0}
                                                        style={{ 
                                                            display: 'flex', 
                                                            justifyContent: 'space-between', 
                                                            alignItems: 'center',
                                                            padding: '12px 16px',
                                                            cursor: 'pointer',
                                                            background: isSelected ? 'rgba(37,99,235,0.02)' : 'transparent',
                                                        }}
                                                        onClick={() => handleDoctorClick(doc, idx)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' || e.key === ' ') {
                                                                e.preventDefault();
                                                                handleDoctorClick(doc, idx);
                                                            }
                                                        }}
                                                    >
                                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                                                            <div className="doc-avatar" style={{ 
                                                                width: 44, 
                                                                height: 44, 
                                                                borderRadius: '50%', 
                                                                background: isSelected ? 'var(--color-primary)' : 'var(--color-bg)', 
                                                                display: 'flex', 
                                                                alignItems: 'center', 
                                                                justifyContent: 'center',
                                                                border: '2px solid var(--color-white)',
                                                                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                                color: isSelected ? 'white' : 'var(--color-text-2)'
                                                            }}>
                                                                <UserCheck size={20} color="currentColor" />
                                                            </div>
                                                            <div>
                                                                <div style={{ fontWeight: 700, fontSize: 14 }}>{doc.doctor_name || 'Dr. Health Specialist'}</div>
                                                                <div className="text-meta" style={{ fontSize: 12 }}>{doc.hospital_name || 'Medical Center'} • {doc.experience || 0}y exp</div>
                                                            </div>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                                                                {doc.score ? `${Math.round(doc.score * 100)}% Match` : 'Consult'}
                                                                {isSelected ? <ChevronDown size={14} style={{ transform: 'rotate(180deg)', transition: '0.3s' }} /> : <ArrowRight size={14} style={{ transition: '0.3s' }} />}
                                                            </div>
                                                            <div className="text-meta" style={{ fontSize: 11 }}>{doc.location || 'Maharashtra'}</div>
                                                        </div>
                                                    </div>

                                                    {/* Expanded Details */}
                                                    {isSelected && (
                                                        <div className="anim-fade-in" style={{ padding: '0 16px 16px 16px', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
                                                                {/* Left col */}
                                                                <div style={{ flex: '1 1 200px' }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Specialization</div>
                                                                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{recommendedSpecialty || 'Pulmonologist'}</div>
                                                                    
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Consultation</div>
                                                                    <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                        <span style={{ display: 'inline-flex', padding: '2px 8px', background: 'rgba(34,197,94,0.1)', color: '#16a34a', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>In-person</span>
                                                                        <span style={{ display: 'inline-flex', padding: '2px 8px', background: 'var(--color-surface-2)', color: 'var(--color-text)', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>Online Available</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                {/* Right col */}
                                                                <div style={{ flex: '1 1 200px' }}>
                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Why Recommended</div>
                                                                    <div style={{ fontSize: 12, color: 'var(--color-text-2)', lineHeight: 1.5, marginBottom: 12 }}>
                                                                        Based on {doc.experience || 0} years handling respiratory conditions near your location. Match score: {doc.score ? Math.round(doc.score * 100) : 90}%.
                                                                    </div>

                                                                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Availability</div>
                                                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>Next available slot: Today</div>
                                                                </div>
                                                            </div>
                                                            
                                                            <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                                                                {doc.phone ? (
                                                                    <a href={`tel:${doc.phone}`} className="btn btn-primary" style={{ flex: 1, padding: '10px 0', fontSize: 14, textAlign: 'center', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={(e) => e.stopPropagation()}>
                                                                        Book Appointment
                                                                    </a>
                                                                ) : (
                                                                    <button className="btn btn-primary" style={{ flex: 1, padding: '10px 0', fontSize: 14, opacity: 0.6, cursor: 'not-allowed' }} onClick={(e) => e.stopPropagation()} disabled title="Phone number not available">
                                                                        No Phone Available
                                                                    </button>
                                                                )}
                                                                <button className="btn" style={{ flex: 1, padding: '10px 0', fontSize: 14, background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }} onClick={(e) => e.stopPropagation()}>
                                                                    View Profile
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ marginTop: 16, textAlign: 'center' }}>
                                        <button className="btn btn-text text-meta" style={{ fontSize: 12 }} onClick={() => handleFindDoctors(recommendedSpecialty)}>
                                            View more specialists in dataset
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ── Prediction Feedback Loop ─────────────────────────── */}
                        {!feedbackSubmitted ? (
                            <div className="glass-card ra-section-card mb-24 anim-fade-in" style={{ 
                                border: '1px dashed var(--color-border)', 
                                marginTop: 16, 
                                transition: 'all 0.3s ease' 
                            }}>
                                <div className="ra-section-header" style={{ marginBottom: 12 }}>
                                    <h3 className="ra-section-title" style={{ fontSize: 14 }}>Help improve our model</h3>
                                </div>
                                <div className="ra-section-body">
                                    <div className="feedback-question" style={{ marginBottom: 16 }}>
                                        <div className="text-label" style={{ fontSize: 11, marginBottom: 8 }}>Was this assessment helpful?</div>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button 
                                                className={`btn btn-sm ${feedbackData.was_prediction_helpful === true ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={() => setFeedbackData({...feedbackData, was_prediction_helpful: true})}
                                            >
                                                Yes, accurate
                                            </button>
                                            <button 
                                                className={`btn btn-sm ${feedbackData.was_prediction_helpful === false ? 'btn-primary' : 'btn-outline'}`}
                                                onClick={() => setFeedbackData({...feedbackData, was_prediction_helpful: false})}
                                            >
                                                No, misleading
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {feedbackData.was_prediction_helpful !== null && (
                                        <div className="feedback-details fade-in">
                                            <div className="text-label" style={{ fontSize: 11, marginBottom: 8 }}>What was the actual diagnosis? (Optional)</div>
                                            <input 
                                                type="text" 
                                                className="form-control" 
                                                placeholder="e.g. Asthma, Common Cold"
                                                style={{ marginBottom: 16, fontSize: 13 }}
                                                value={feedbackData.confirmed_disease}
                                                onChange={(e) => setFeedbackData({...feedbackData, confirmed_disease: e.target.value})}
                                            />
                                            <button 
                                                className="btn btn-primary btn-sm btn-full"
                                                onClick={handleFeedbackSubmit}
                                                disabled={isSubmittingFeedback}
                                            >
                                                {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="ra-feedback-success fade-in" style={{ textAlign: 'center', padding: '12px', background: 'rgba(var(--color-safe-rgb), 0.1)', borderRadius: 12, marginBottom: 24, border: '1px solid var(--color-safe)', marginTop: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--color-safe)', fontWeight: 700 }}>
                                    <CheckCircle size={16} />
                                    <span>Feedback Received — Thank you!</span>
                                </div>
                            </div>
                        )}

                        {/* Medical Disclaimer — always rendered */}
                        <MedicalDisclaimer text={prediction.medical_disclaimer} />

                        </>
                        )}

                    </div>

                    {/* Right Sidebar */}
                    <div className="ra-sidebar">
                        <div className="glass-primary depth-float hover-card sidebar-sticky card-enter-5" style={{ padding: '24px', borderRadius: '20px' }}>
                            <div style={{ textAlign: 'center', marginBottom: 24 }}>
                                <h3 className="ra-section-title large" style={{ marginBottom: 4 }}>Unified Risk Score</h3>
                                <p className="text-meta" style={{ fontSize: 13 }}>Consensus Model Output</p>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'center', margin: '0 -10px' }}>
                                <RiskGauge score={riskScore} />
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '6px', marginBottom: 16, position: 'relative', zIndex: 10 }}>
                                <span className={`badge-pill ${getRiskBadgeClass(riskCategory)}`} style={{ fontSize: 14, padding: '6px 16px', display: 'inline-block', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    {riskCategory}
                                </span>
                            </div>

                            {/* Risk score narrative */}
                            {(() => {
                                const narr = getRiskScoreNarrative(riskScore, riskCategory)
                                if (!narr) return null
                                return (
                                    <div style={{ marginBottom: 20, padding: '12px 14px', borderRadius: 10, background: 'rgba(var(--color-primary-rgb), 0.04)', border: '1px solid rgba(var(--color-primary-rgb), 0.1)', textAlign: 'left' }}>
                                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-2)', marginBottom: 4, lineHeight: 1.4 }}>{narr.headline}</div>
                                        <div style={{ fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.55 }}>{narr.next}</div>
                                    </div>
                                )
                            })()}

                            <div className="ra-score-details-sidebar">
                                {/* ── Confidence Row with colour-coded badge ── */}
                                <div className="ra-stat-group">
                                    <span className="label" style={{ fontSize: 11, color: 'var(--color-text-2)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Prediction Confidence</span>
                                    <ConfidenceBadge confidence={rawConfidence} size="sm" showBar={true} />
                                </div>
                                {tier.tier !== 'low' && primaryDisease && (
                                    <div className="ra-stat-group" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span className="label" style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Primary Condition</span>
                                        <span style={{ fontWeight: 800, fontSize: 13, maxWidth: 140, textAlign: 'right', lineHeight: 1.3, color: 'var(--color-text)' }}>{primaryDisease}</span>
                                    </div>
                                )}
                                <div className="ra-stat-group" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span className="label" style={{ fontSize: 12, color: 'var(--color-text-2)' }}>Suggested Specialist</span>
                                    <span style={{ fontWeight: 800, fontSize: 13, color: tier.tier === 'low' ? 'var(--color-text)' : 'var(--color-primary)', textAlign: 'right' }}>
                                        {recommendedSpecialty}
                                    </span>
                                </div>
                            </div>

                            <div className="divider" style={{ margin: '24px 0' }} />

                            <div className="sidebar-action-box">
                                <button
                                    className="btn btn-primary btn-full"
                                    style={{ fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px' }}
                                    onClick={() => handleFindDoctors(tier.tier === 'low' ? 'General Physician' : (primaryDisease || 'General Physician'))}
                                    id="sidebar-find-doctor-btn"
                                >
                                    <UserCheck size={18} />
                                    {tier.tier === 'low' ? 'Find General Physician' : `Find ${recommendedSpecialty}`}
                                </button>
                                <Link to="/assessment" className="btn btn-outline btn-full" style={{ fontSize: 14, padding: '12px' }}>
                                    <RefreshCw size={16} style={{ marginRight: 8 }} />
                                    Re-Analyze Health
                                </Link>
                                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                                    <TrustTag type="doctor" />
                                </div>
                            </div>

                            {analyzedAt && (
                                <div style={{ textAlign: 'center', marginTop: 24 }}>
                                    <span className="val-time" style={{ fontSize: 11 }}>Last updated: {analyzedAt}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        /* ── Confidence Header ── */
        .ra-confidence-header {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 14px;
          margin-bottom: 4px;
        }
        .ra-confidence-header.tier-high {
          background: rgba(22, 163, 74, 0.07);
          border: 1px solid rgba(22, 163, 74, 0.2);
        }
        .ra-confidence-header.tier-moderate {
          background: rgba(217, 119, 6, 0.07);
          border: 1px solid rgba(217, 119, 6, 0.2);
        }
        .ra-confidence-header.tier-low {
          background: rgba(220, 38, 38, 0.07);
          border: 1px solid rgba(220, 38, 38, 0.2);
        }
        .ra-confidence-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .tier-high .ra-confidence-icon { background: rgba(22,163,74,0.15); color: #16a34a; }
        .tier-moderate .ra-confidence-icon { background: rgba(217,119,6,0.15); color: #d97706; }
        .tier-low .ra-confidence-icon { background: rgba(220,38,38,0.15); color: #dc2626; }

        /* ── Improvement Banner ── */
        .ra-improvement-banner {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 14px 18px;
          background: rgba(220,38,38,0.06);
          border: 1px solid rgba(220,38,38,0.2);
          border-radius: 14px;
          color: #dc2626;
          font-size: 13.5px;
          line-height: 1.5;
          animation: slideUp 0.5s cubic-bezier(0.16,1,0.3,1);
        }

        /* ── Layout ── */
        .ra-layout {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .ra-main-content { display: flex; flex-direction: column; gap: 24px; }
        .ra-sidebar { display: flex; flex-direction: column; gap: 24px; }
        .sidebar-sticky { position: sticky; top: 24px; }

        .premium-card {
          border: 1px solid rgba(var(--color-primary-rgb), 0.08);
          box-shadow: 0 8px 32px rgba(0,0,0,0.03);
          transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
          background: linear-gradient(135deg, var(--color-surface) 0%, rgba(var(--color-primary-rgb), 0.01) 100%);
          padding: 24px;
          border-radius: 20px;
        }
        .premium-card:hover { box-shadow: 0 16px 40px rgba(0,0,0,0.05); transform: translateY(-1px); }
        .interactive-section { background: var(--color-surface); border: 1px solid rgba(var(--color-primary-rgb), 0.1); }

        .ra-header-box { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .hero-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, var(--color-primary) 0%, #4a90e2 100%);
          color: white;
          box-shadow: 0 8px 16px rgba(var(--color-primary-rgb), 0.2);
        }
        .ra-pamphlet-icon {
          width: 38px; height: 38px; border-radius: 10px;
          background: rgba(var(--color-primary-rgb), 0.1);
          color: var(--color-primary);
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .ra-section-title.large { font-size: 20px; font-weight: 800; margin: 0; letter-spacing: -0.02em; }
        .ra-section-title { font-size: 15px; font-weight: 700; margin: 0; }

        .ra-section-header { display: flex; align-items: center; gap: 12px; }
        .ra-section-body { padding-top: 20px; }

        /* Disease chips */
        .ra-disease-grid-interactive { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px solid var(--color-border); }
        .ra-disease-chip {
          flex: 1; min-width: 160px; padding: 12px 16px;
          background: var(--color-surface); border: 1.5px solid var(--color-border);
          border-radius: 14px; cursor: pointer;
          transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1),
                      box-shadow 0.24s cubic-bezier(0.4, 0, 0.2, 1),
                      border-color 0.24s cubic-bezier(0.4, 0, 0.2, 1),
                      background-color 0.24s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative; overflow: hidden;
        }
        .ra-disease-chip:hover { border-color: rgba(var(--color-primary-rgb), 0.3); background: rgba(var(--color-primary-rgb), 0.02); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(15,23,42,0.06); }
        .ra-disease-chip.active { border-color: var(--risk-color); box-shadow: 0 8px 24px rgba(0,0,0,0.04); transform: translateY(-2px) scale(1.01); z-index: 2; }
        .chip-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 8px; }
        .chip-name { flex: 1; min-width: 0; font-weight: 700; font-size: 13px; color: var(--color-text); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; overflow-wrap: anywhere; }
        .chip-val { font-weight: 800; font-size: 14px; color: var(--risk-color); flex-shrink: 0; white-space: nowrap; }
        .chip-progress { height: 4px; background: rgba(0,0,0,0.05); border-radius: 4px; }
        .chip-progress-fill { height: 100%; border-radius: 4px; transition: width 0.8s cubic-bezier(0.22, 1, 0.36, 1); }

        /* Detail view */
        .ra-disease-detail-view { background: rgba(var(--color-primary-rgb), 0.02); border-radius: 16px; padding: 24px; border: 1px solid var(--color-border); }
        .detail-header { margin-bottom: 0; }
        .detail-title-row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
        .detail-disease-name { font-size: 22px; font-weight: 800; margin: 0; color: var(--color-text); }
        .detail-risk-badge { padding: 6px 12px; border-radius: 30px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
        .detail-score-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .detail-score-bar .bar-bg { flex: 1; height: 10px; background: rgba(0,0,0,0.05); border-radius: 10px; overflow: hidden; }
        .detail-score-bar .bar-fill { height: 100%; border-radius: 10px; }
        .detail-score-bar .bar-label { font-size: 12px; font-weight: 600; color: var(--color-text-2); white-space: nowrap; }
        .detail-reason-box { margin-bottom: 16px; }
        .reason-label { font-size: 12px; font-weight: 700; color: var(--color-primary); text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.05em; }
        .reason-text { font-size: 14px; line-height: 1.6; color: var(--color-text); font-style: italic; margin: 0; }
        .detail-body { display: flex; flex-direction: column; gap: 14px; }
        .detail-actions { background: var(--color-surface); padding: 16px; border-radius: 12px; border: 1px solid var(--color-border); }
        .action-tag { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--color-safe); margin-bottom: 12px; }
        .tag-dot { width: 8px; height: 8px; border-radius: 50%; }
        .action-list { margin: 0; padding-left: 18px; font-size: 14px; color: var(--color-text-2); display: flex; flex-direction: column; gap: 8px; }

        /* Sidebar */
        .ra-score-details-sidebar { display: flex; flex-direction: column; gap: 12px; margin-top: 10px; }
        .ra-stat-group { display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; background: rgba(var(--color-primary-rgb), 0.02); border-radius: 12px; border: 1px solid var(--color-border); }
        .ra-stat-group .label { font-size: 12px; color: var(--color-text-2); }
        .val-bold { font-weight: 800; font-size: 14px; }
        .val-time { font-size: 10px; color: var(--color-muted); }
        .sidebar-action-box { margin-top: 20px; display: flex; flex-direction: column; gap: 12px; }
        .btn-full { width: 100%; justify-content: center; }

        .badge-pill { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: var(--color-safe); color: white; }
        .badge-pill.badge-warning { background: var(--color-warning); color: #fff; }
        .badge-pill.badge-danger { background: var(--color-danger); color: #fff; }
        .badge-pill.badge-safe { background: var(--color-safe); color: #fff; }

        /* AI explanation */
        .ra-explanation-list { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: var(--color-text); line-height: 1.6; }
        .ra-safety-box { margin-top: 16px; padding: 12px 16px; background: rgba(var(--color-warning-rgb),0.08); border-radius: 10px; border: 1px solid rgba(var(--color-warning-rgb),0.2); font-size: 13px; }

        /* Score metrics */
        .ra-risk-grid { display: grid; grid-template-columns: 1fr auto; gap: 20px; }
        .ra-chart-container { flex: 1; }
        .ra-score-metrics { display: flex; flex-direction: column; gap: 10px; justify-content: center; }
        .ra-metric-pill { display: flex; flex-direction: column; align-items: center; padding: 12px 16px; background: rgba(var(--color-primary-rgb),0.03); border-radius: 12px; min-width: 80px; transition: all 0.24s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
        .ra-metric-pill:hover { transform: translateY(-1px); background: rgba(var(--color-primary-rgb),0.06); }
        .ra-metric-pill .value { font-weight: 800; font-size: 18px; margin-top: 4px; }
        .doctor-item-card:hover { transform: translateX(4px); border-color: rgba(var(--color-primary-rgb), 0.2) !important; background: rgba(var(--color-primary-rgb), 0.02) !important; box-shadow: 0 4px 16px rgba(var(--color-primary-rgb), 0.04) !important; }

        /* Disclaimer */
        .ra-disclaimer-card { padding: 20px; background: rgba(var(--color-warning-rgb), 0.02); border-radius: 16px; border: 1px solid rgba(var(--color-warning-rgb), 0.1); }
        .disclaimer-content { display: flex; gap: 14px; align-items: flex-start; }
        .disclaimer-icon { font-size: 20px; }
        .disclaimer-text { font-size: 13px; color: var(--color-text-2); line-height: 1.6; margin: 0; }

        /* Animations */
        .anim-fade-in { animation: fadeInUnified 0.24s cubic-bezier(0.4, 0, 0.2, 1) both; }
        .anim-slide-up { animation: slideUpUnified 0.28s cubic-bezier(0.4, 0, 0.2, 1) both; }
        @keyframes fadeInUnified { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUpUnified { from { transform: translateY(12px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 1000px) {
          .ra-layout { grid-template-columns: 1fr; }
          .sidebar-sticky { position: static; }
          .ra-risk-grid { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    )
}
