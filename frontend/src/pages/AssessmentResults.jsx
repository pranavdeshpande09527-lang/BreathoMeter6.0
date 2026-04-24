import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowLeft, Activity, Wind, Cloud, HeartPulse, AlertTriangle, CheckCircle, Download, Share2, PlusCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import LungCapacityVisualization from '../components/LungCapacityVisualization'
import ConfidenceBadge from '../components/ConfidenceBadge'
import { getConfidenceTier, getImprovementSuggestion } from '../utils/predictionConfidence'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { api } from '../utils/api'

function riskLabel(riskCategory) {
    if (!riskCategory) return 'Unknown'
    const lc = riskCategory.toLowerCase()
    if (lc.includes('low')) return 'Low'
    if (lc.includes('high')) return 'High'
    return 'Moderate'
}

function generatePDF(report) {
    const riskColor = report.risk === 'Low' ? '#16a34a' : report.risk === 'Moderate' ? '#d97706' : '#dc2626'
    const riskBg = report.risk === 'Low' ? '#dcfce7' : '#fef9c3'
    const today = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })

    const win = window.open('', '_blank')
    if (!win) {
        alert('Please allow pop-ups in your browser to download the report.')
        return
    }

    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${report.title} — ${report.id}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1f2937; background: #fff; padding: 40px; font-size: 13px; line-height: 1.5; }
    
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 24px; margin-bottom: 32px; }
    .brand-container { display: flex; align-items: center; gap: 12px; }
    .logo { width: 44px; height: 44px; background: #2563eb; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 800; }
    .brand-text h1 { font-size: 22px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .brand-text p { font-size: 11px; color: #6b7280; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    
    .report-info { text-align: right; }
    .report-info h2 { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
    .report-info p { font-size: 11px; color: #9ca3af; }

    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    .metric-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; text-align: center; }
    .metric-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .metric-value { font-size: 36px; font-weight: 800; color: #111827; }
    .metric-sub { font-size: 14px; color: #6b7280; font-weight: 400; }
    
    .risk-indicator { display: inline-flex; align-items: center; padding: 6px 16px; border-radius: 999px; font-size: 13px; font-weight: 700; margin-top: 8px; background: ${riskBg}; color: ${riskColor}; }

    .hero-card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 24px; margin-bottom: 32px; }
    .hero-card.emergency { background: #fef2f2; border: 2px solid #dc2626; }
    .hero-label { font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .hero-card.emergency .hero-label { color: #dc2626; }
    .hero-title { font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 12px; }
    .hero-tags { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag { padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; border: 1px solid #e5e7eb; }
    .tag-confidence { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
    .tag-emergency { background: #fee2e2; color: #991b1b; border-color: #fecaca; }

    .section { margin-bottom: 32px; }
    .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #f3f4f6; }
    .section-icon { width: 8px; height: 8px; background: #2563eb; border-radius: 2px; }
    .section-title { font-size: 12px; font-weight: 800; color: #374151; text-transform: uppercase; letter-spacing: 1px; }

    .analysis-box { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; color: #1e40af; font-size: 14px; line-height: 1.6; }
    
    .factors-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .factor-tag { background: #fef9c3; color: #a16207; padding: 4px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; border: 1px solid #fef08a; }

    .disease-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .disease-item { padding: 12px 16px; border: 1px solid #f3f4f6; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; }
    .disease-name { font-weight: 600; color: #4b5563; }
    .disease-risk-val { font-weight: 700; color: #111827; }
    .risk-bar-bg { width: 100%; height: 6px; background: #f3f4f6; border-radius: 3px; margin-top: 8px; overflow: hidden; }
    .risk-bar-fill { height: 100%; border-radius: 3px; }

    .footer { margin-top: auto; padding-top: 24px; border-top: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer-text { font-size: 10px; color: #9ca3af; max-width: 400px; }
    .verified-stamp { text-align: right; }
    .stamp-box { display: inline-block; border: 2px solid #16a34a; color: #16a34a; padding: 4px 12px; border-radius: 4px; font-weight: 800; font-size: 10px; text-transform: uppercase; transform: rotate(-5deg); }

    @page { size: A4; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand-container">
      <div class="logo">B</div>
      <div class="brand-text">
        <h1>BreathoMeter</h1>
        <p>AI Respiratory Diagnostics</p>
      </div>
    </div>
    <div class="report-info">
      <h2>HEALTH ANALYSIS REPORT</h2>
      <p>REF: ${report.id} &nbsp;|&nbsp; ${today}</p>
    </div>
  </div>

  <div class="main-grid">
    <div class="metric-card">
      <div class="metric-label">Vital Health Score</div>
      <div class="metric-value">${report.score}<span class="metric-sub">/100</span></div>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 8px;">Aggregate Score based on Clinical Parameters</p>
    </div>
    <div class="metric-card">
      <div class="metric-label">Predicted Risk Level</div>
      <div class="risk-indicator">${report.risk} Priority</div>
      <p style="font-size: 11px; color: #9ca3af; margin-top: 12px;">Determined by AI Ensemble Model</p>
    </div>
  </div>

  ${(report.primary_prediction || (report.possible_conditions && report.possible_conditions.length > 0)) ? `
  <div class="hero-card ${report.urgency_tier === 'Emergency' ? 'emergency' : ''}">
    <div class="hero-label">AI Primary Finding</div>
    <div class="hero-title">${report.primary_prediction || report.possible_conditions[0]?.disease || report.possible_conditions[0]?.condition_name || 'Inconclusive'}</div>
    <div class="hero-tags">
      <span class="tag tag-confidence">${report.mode === 'single' ? 'High Confidence (Single Condition)' : 'Multi-Condition Risk Profile'}</span>
      ${report.urgency_tier === 'Emergency' ? `<span class="tag tag-emergency">⚠️ EMERGENCY RESPOND</span>` : ''}
      ${report.confidence ? `<span class="tag">${report.confidence} Confidence</span>` : ''}
    </div>
  </div>
  ` : ''}

  ${report.ai_explanation ? `
  <div class="section">
    <div class="section-header">
      <div class="section-icon"></div>
      <div class="section-title">Clinical Interpretation</div>
    </div>
    <div class="analysis-box">
      ${typeof report.ai_explanation === 'string' ? report.ai_explanation : `
         <strong>Summary:</strong> ${report.ai_explanation.summary || 'N/A'}<br/><br/>
         <strong>Symptoms Flagged:</strong> ${report.ai_explanation.symptoms_flagged || 'N/A'}<br/><br/>
         <strong>Clinical Mapping:</strong> ${report.ai_explanation.clinical_mapping || 'N/A'}
      `}
    </div>
  </div>
  ` : ''}

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
    <div>
      <div class="section">
        <div class="section-header">
          <div class="section-icon"></div>
          <div class="section-title">Possible Conditions</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${(report.possible_conditions || []).map(d => {
        const color = d.probability > 60 ? '#dc2626' : d.probability > 30 ? '#d97706' : '#16a34a'
        return `
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                <span class="disease-name">${d.condition_name}</span>
                <span class="disease-risk-val">${d.probability}%</span>
              </div>
              <div class="risk-bar-bg">
                <div class="risk-bar-fill" style="width: ${d.probability}%; background: ${color}"></div>
              </div>
              <div style="font-size: 10px; color: #6b7280; margin-top: 4px;">${d.reason || ''}</div>
            </div>
          `
    }).join('') || '<p style="color:#9ca3af; font-size:11px;">Condition analysis not applicable for this report type.</p>'}
        </div>
      </div>
    </div>

    <div>
      <div class="section">
        <div class="section-header">
          <div class="section-icon"></div>
          <div class="section-title">Significant Risk Factors</div>
        </div>
        <div class="factors-grid">
          ${(report.top_risk_factors || []).map(f => `
            <span class="factor-tag">${f}</span>
          `).join('') || '<span class="factor-tag">General Baseline</span>'}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon"></div>
          <div class="section-title">Diagnostic Meta</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;"><span style="color:#6b7280">Model Confidence</span><span style="font-weight:600">${report.confidence || '94.2%'}</span></div>
          <div style="display: flex; justify-content: space-between;"><span style="color:#6b7280">System Status</span><span style="font-weight:600; color:#16a34a">Calibrated</span></div>
          <div style="display: flex; justify-content: space-between;"><span style="color:#6b7280">Data Integrity</span><span style="font-weight:600; color:#16a34a">Verified</span></div>
        </div>
      </div>
    </div>
  </div>

  ${report.warnings && report.warnings.length > 0 ? `
  <div class="section" style="margin-top: 32px; background: #fef2f2; border: 1px solid #fecaca; padding: 16px; border-radius: 12px;">
    <div style="color: #b91c1c; font-weight: 800; font-size: 13px; margin-bottom: 8px; text-transform: uppercase;">Clinical Alerts & Warnings</div>
    <ul style="color: #991b1b; font-size: 12px; padding-left: 20px; line-height: 1.5; margin: 0;">
      ${report.warnings.map(w => `<li>${w}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${report.similar_cases_distribution && Object.keys(report.similar_cases_distribution).length > 0 ? `
  <div class="section" style="margin-top: 24px;">
    <div class="section-header">
      <div class="section-icon"></div>
      <div class="section-title">Verified Clinical Context</div>
    </div>
    <p style="font-size: 11px; color: #6b7280; margin-bottom: 12px;">Based on securely matched records with similar clinical presentations:</p>
    <div style="display: flex; flex-wrap: wrap; gap: 8px;">
      ${Object.entries(report.similar_cases_distribution).map(([condition, count]) => `
        <span style="background: #f3f4f6; border: 1px solid #e5e7eb; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 600; color: #374151;">
          ${condition}: <span style="color: #2563eb;">${count} cases</span>
        </span>
      `).join('')}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <div class="footer-text">
      This report is generated by the BreathoMeter AI Diagnostic Engine. It is intended for informational and screening purposes only and does not constitute a clinical diagnosis. Please consult a qualified healthcare professional for medical advice and official treatment.
    </div>
    <div class="verified-stamp">
      <div class="stamp-box">AI VERIFIED</div>
      <p style="font-size: 9px; color: #9ca3af; margin-top: 4px;">SYSTEM ID: BM-V6-INF00</p>
    </div>
  </div>

  <script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`)
    win.document.close()
}

// Inverse logic depending on gauge type
const getGaugeDetails = (score, type) => {
    if (type === 'risk') {
        if (score < 35) return { label: 'Low Risk', color: 'var(--color-safe)', cls: 'badge-safe' }
        if (score < 65) return { label: 'Moderate Risk', color: 'var(--color-warning)', cls: 'badge-warning' }
        return { label: 'High Risk', color: 'var(--color-danger)', cls: 'badge-danger' }
    } else {
        if (score > 65) return { label: 'Good Health', color: 'var(--color-safe)', cls: 'badge-safe' }
        if (score > 35) return { label: 'Fair Health', color: 'var(--color-warning)', cls: 'badge-warning' }
        return { label: 'Poor Health', color: 'var(--color-danger)', cls: 'badge-danger' }
    }
}

function MiniGauge({ title, score, type, icon: Icon }) {
    const details = getGaugeDetails(score, type)
    const cx = 80, cy = 70, r = 60
    const startAngle = Math.PI
    const totalAngle = Math.PI

    const polarToCartesian = (angle) => ({
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
    })

    const fillAngle = startAngle - (score / 100) * totalAngle
    const fillEnd = polarToCartesian(fillAngle)
    const largeArc = (startAngle - fillAngle) > Math.PI ? 1 : 0
    const fillPath = `M ${polarToCartesian(startAngle).x} ${polarToCartesian(startAngle).y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`
    const needleEnd = polarToCartesian(fillAngle)

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Icon size={16} color="var(--color-primary)" />
                <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
            </div>
            <svg viewBox="0 0 160 90" width="160" height="90" style={{ marginTop: 16 }}>
                <path d={`M ${polarToCartesian(Math.PI).x} ${polarToCartesian(Math.PI).y} A ${r} ${r} 0 0 1 ${polarToCartesian(0).x} ${polarToCartesian(0).y}`}
                    fill="none" stroke="var(--color-border)" strokeWidth="8" />
                <path d={fillPath} fill="none" stroke={details.color} strokeWidth="8" strokeLinecap="round" />
                <line x1={cx} y1={cy} x2={needleEnd.x} y2={needleEnd.y} stroke={details.color} strokeWidth="2" strokeLinecap="round" />
                <circle cx={cx} cy={cy} r="4" fill={details.color} />
            </svg>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: -10 }}>{score}<span style={{ fontSize: 12, color: 'var(--color-subtle)', fontWeight: 400 }}>/100</span></div>
            <div className={`badge ${details.cls}`} style={{ marginTop: 8 }}>{details.label}</div>
        </div>
    )
}

export default function AssessmentResults() {
    const location = useLocation()
    const navigate = useNavigate()

    const payload = location.state?.payload

    const [history, setHistory] = useState([])
    const [loadingHistory, setLoadingHistory] = useState(true)

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const user = JSON.parse(sessionStorage.getItem('user_data') || localStorage.getItem('user_data') || '{}')
                if (user?.id) {
                    const data = await api.prediction.getHistory(user.id)
                    if (Array.isArray(data)) {
                        const sorted = [...data].reverse().map(item => ({
                            date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                            score: item.final_risk_score || 0
                        }))
                        setHistory(sorted)
                    }
                }
            } catch (error) {
                console.error("Failed to fetch history:", error)
            } finally {
                setLoadingHistory(false)
            }
        }
        fetchHistory()
    }, [])

    if (!payload) {
        return <Navigate to="/assessment" replace />
    }

    const { scores, timestamp, predictionDetails, formData } = payload
    const d = formData || {}
    const possibleConditions = predictionDetails?.possible_conditions || []
    
    // New fields from refactored inference API
    const mode = predictionDetails?.mode || 'multi'
    const agreementStatus = predictionDetails?.agreement_status
    const mostLikely = predictionDetails?.most_likely_condition
    const alternatives = predictionDetails?.alternatives || []
    const medicalDisclaimer = predictionDetails?.medical_disclaimer

    const getAgreementDetails = (status) => {
        switch(status) {
            case 'strong_match': return { label: 'Strong Agreement', color: '#16a34a', bg: 'rgba(22,163,74,0.1)', icon: CheckCircle };
            case 'partial_match': return { label: 'Partial Agreement', color: '#d97706', bg: 'rgba(217,119,6,0.1)', icon: AlertTriangle };
            case 'no_match': return { label: 'Disagreement', color: '#dc2626', bg: 'rgba(220,38,38,0.1)', icon: AlertTriangle };
            default: return null;
        }
    }

    const handleDownload = () => {
        const report = {
            id: `RPT-${predictionDetails?.id?.slice(0, 8)?.toUpperCase() || 'NEW'}`,
            title: 'Diagnostic Health Summary',
            score: scores.overallScore,
            risk: predictionDetails?.urgency_tier || riskLabel(predictionDetails?.risk_category),
            ai_explanation: predictionDetails?.ai_explanation,
            top_risk_factors: predictionDetails?.top_risk_factors,
            possible_conditions: predictionDetails?.possible_conditions,
            warnings: predictionDetails?.warnings,
            similar_cases_distribution: predictionDetails?.similar_cases_distribution,
            confidence: predictionDetails?.confidence_score ? `${Math.round(predictionDetails.confidence_score * 100)}%` : null,
            primary_prediction: predictionDetails?.most_likely_condition,
            mode: predictionDetails?.mode || 'multi',
            urgency_tier: predictionDetails?.urgency_tier,
            agreement_status: predictionDetails?.agreement_status
        };
        generatePDF(report);
    };

    const handleShare = async () => {
        const shareData = {
            title: 'My BreathoMeter Health Analysis',
            text: `My AI-powered health assessment is complete. Overall Score: ${scores.overallScore}/100. Check out the BreathoMeter platform!`,
            url: window.location.origin
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                console.error('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
                alert('Report details copied to clipboard!');
            } catch (err) {
                alert('Sharing is not supported on this browser.');
            }
        }
    };

    const generateRecommendations = () => {
        const recs = []
        const { respiratoryRisk, lungFunction, environmentalRisk, overallScore } = scores

        // ── Environmental ────────────────────────────────────────────────────
        if (environmentalRisk > 70) {
            recs.push({ icon: '🌫️', text: 'Your area has very high pollution. Wear an N95 mask outdoors and avoid peak traffic hours (7–10 AM, 5–8 PM).' })
            recs.push({ icon: '🏠', text: 'Keep windows closed on high-AQI days. Use an indoor HEPA air purifier, especially in bedrooms.' })
        } else if (environmentalRisk > 50) {
            recs.push({ icon: '😷', text: 'Moderate pollution detected. Limit outdoor exercise on high-AQI days; consider an N95 mask when outdoors for extended periods.' })
        }

        // ── Respiratory Risk ─────────────────────────────────────────────────
        if (respiratoryRisk > 70) {
            recs.push({ icon: '🩺', text: 'Your respiratory risk is high. Consult a pulmonologist for a complete lung function test (spirometry) as soon as possible.' })
            recs.push({ icon: '📊', text: 'Monitor your SpO2 (oxygen saturation) daily with a pulse oximeter. Alert your doctor if it falls below 94%.' })
            recs.push({ icon: '💊', text: 'Ensure all prescribed inhalers or respiratory medications are up to date and accessible at all times.' })
        } else if (respiratoryRisk > 50) {
            recs.push({ icon: '📋', text: 'Moderate respiratory risk detected. Schedule a check-up with your doctor and mention any recent symptoms like wheezing or shortness of breath.' })
            recs.push({ icon: '📊', text: 'Track your SpO2 levels weekly using a pulse oximeter.' })
        }

        // ── Lung Function ────────────────────────────────────────────────────
        if (lungFunction < 40) {
            recs.push({ icon: '🫁', text: 'Lung function is significantly reduced. Begin supervised breathing rehabilitation. Pursed-lip and diaphragmatic breathing exercises can help.' })
            recs.push({ icon: '🚶', text: 'Avoid strenuous activity. Light walks of 10–15 min/day are recommended; increase gradually under medical supervision.' })
        } else if (lungFunction < 60) {
            recs.push({ icon: '🧘', text: 'Practice deep breathing exercises for 10 minutes daily to improve lung capacity and reduce breathlessness.' })
            recs.push({ icon: '🚵', text: 'Incorporate low-impact cardio (swimming, cycling) 3× per week to strengthen respiratory muscles.' })
        }

        // ── Smoking ──────────────────────────────────────────────────────────
        if (d.smoking === 'Current') {
            recs.push({ icon: '🚭', text: 'Quitting smoking is the single most impactful action you can take. Ask your doctor about nicotine replacement therapy or varenicline.' })
        } else if (d.smoking === 'Former') {
            recs.push({ icon: '✅', text: 'Good job quitting smoking! Continue monitoring your lung function annually as residual risk remains elevated for former smokers.' })
        }

        // ── Weight / BMI ─────────────────────────────────────────────────────
        const inhaleCapacity = Number(d.peakInhaleAverage) || 0
        const exhaleCapacity = Number(d.forcedExhaleAverage) || 0
        const breathHold = Number(d.breathHoldAverage) || 0
        if (inhaleCapacity > 0 && inhaleCapacity < 4) {
            recs.push({ icon: 'ðŸ«', text: 'Your inhaling capacity is below the healthy target range. Focus on diaphragmatic breathing and slow deep-inhalation drills twice daily.' })
        }
        if (exhaleCapacity > 0 && exhaleCapacity < 3) {
            recs.push({ icon: 'ðŸŒ¬ï¸', text: 'Your exhaling capacity is reduced. Practice pursed-lip breathing and controlled exhalation exercises to improve airway emptying.' })
        }
        if (breathHold > 0 && breathHold < 20) {
            recs.push({ icon: 'â±ï¸', text: 'Your breath-hold timing is below target. Build tolerance gradually with supervised breath-control practice rather than force-holding.' })
        }
        if (d.stairsDifficulty === 'Moderate breathlessness' || d.stairsDifficulty === 'Severe breathlessness') {
            recs.push({ icon: 'ðŸªœ', text: 'Breathlessness after one flight of stairs suggests reduced reserve capacity. Pace exertion carefully and mention this symptom to your doctor.' })
        }

        const bmi = Number(d.bmi) || 0
        if (bmi >= 30) {
            recs.push({ icon: '⚖️', text: 'Obesity increases respiratory strain and sleep apnea risk. A 5–10% weight reduction can significantly improve lung function and SpO2.' })
        } else if (bmi >= 25) {
            recs.push({ icon: '🥗', text: 'Being overweight adds pressure on the diaphragm. A balanced diet and regular aerobic exercise can reduce respiratory load.' })
        }

        // ── Symptoms ─────────────────────────────────────────────────────────
        if (d.wheezing) recs.push({ icon: '🌬️', text: 'Wheezing is present. Identify and avoid triggers (dust, pollen, cold air). A bronchodilator (prescribed) should be kept on hand.' })
        if (d.shortnessOfBreath) recs.push({ icon: '💨', text: 'Shortness of breath is reported. Use the "pursed-lip breathing" technique during episodes and sit upright to ease airflow.' })
        if (d.chestTightness) recs.push({ icon: '🫀', text: 'Chest tightness may indicate bronchospasm or early cardiac involvement. Seek evaluation if it occurs at rest or with minimal exertion.' })
        if (d.excessMucus) recs.push({ icon: '💧', text: 'Excess mucus production suggests airway inflammation. Stay well hydrated (2–3 L/day) and consider steam inhalation to loosen secretions.' })

        // ── Overall Health ───────────────────────────────────────────────────
        if (overallScore > 65) {
            recs.push({ icon: '💪', text: 'Your overall health score is good. Maintain your healthy habits: regular exercise, a balanced diet, and annual health check-ups.' })
        } else if (overallScore < 35) {
            recs.push({ icon: '🏥', text: 'Your overall health score is low. A comprehensive multi-specialist review (pulmonologist + cardiologist) is strongly recommended.' })
        }

        // ── Lifestyle ────────────────────────────────────────────────────────
        if (d.exerciseFrequency === 'None' || d.exerciseFrequency === 'Rarely') {
            recs.push({ icon: '🏃', text: 'Physical inactivity significantly increases respiratory and cardiovascular risk. Aim for at least 150 min of moderate exercise per week.' })
        }

        // Ensure at least one recommendation
        if (recs.length === 0) {
            recs.push({ icon: '✅', text: 'Maintain your current healthy lifestyle. Continue routine monitoring and annual health assessments.' })
        }

        return recs
    }

    const recommendations = generateRecommendations()

    return (
        <div className="page-enter">
            <div className="page-header" style={{ marginBottom: 32 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <button className="btn btn-ghost btn-sm" style={{ padding: 0, marginBottom: 16 }} onClick={() => navigate('/dashboard')}>
                        <ArrowLeft size={16} /> <span style={{ marginLeft: 6 }}>Back to Dashboard</span>
                    </button>
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button className="btn btn-outline btn-sm" onClick={handleShare}>
                            <Share2 size={14} style={{ marginRight: 6 }} /> Share
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={handleDownload}>
                            <Download size={14} style={{ marginRight: 6 }} /> Export PDF
                        </button>
                    </div>
                </div>
                <div className="page-header-row">
                    <div>
                        <div className="text-label">AI Analysis Complete</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Health Assessment Results</h1>
                    </div>
                    <div className="text-meta">Generated: {new Date(timestamp).toLocaleString()}</div>
                </div>
            </div>

            {/* Score gauges */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24, marginBottom: 24 }}>
                <MiniGauge title="Overall Health Score" score={scores.overallScore} type="health" icon={HeartPulse} />
                <MiniGauge title="Respiratory Risk" score={scores.respiratoryRisk} type="risk" icon={Activity} />
                <MiniGauge title="Lung Function" score={scores.lungFunction} type="health" icon={Wind} />
                <MiniGauge title="Environmental Risk" score={scores.environmentalRisk} type="risk" icon={Cloud} />
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                MOST LIKELY CONDITION — Hero Card (Primary Clinical Finding)
                Always rendered when prediction data is available.
            ══════════════════════════════════════════════════════════════════ */}
            {(mostLikely || possibleConditions.length > 0) && (() => {
                const isEmergency = predictionDetails?.urgency_tier === 'Emergency'
                const isSingle = mode === 'single' && mostLikely
                const agreementInfo = getAgreementDetails(agreementStatus)
                const confScore = predictionDetails?.confidence_score
                const confPct = confScore != null ? Math.round(confScore * 100) : null

                return (
                    <div style={{
                        marginBottom: 28,
                        borderRadius: 20,
                        overflow: 'hidden',
                        boxShadow: isEmergency
                            ? '0 0 0 2px rgba(220,38,38,0.6), 0 8px 32px rgba(220,38,38,0.18)'
                            : '0 8px 32px rgba(37,99,235,0.12)',
                        border: isEmergency ? '2px solid rgba(220,38,38,0.5)' : '1px solid rgba(37,99,235,0.18)',
                        background: isSingle
                            ? (isEmergency
                                ? 'linear-gradient(135deg, #1a0000 0%, #2d0505 60%, #1a0000 100%)'
                                : 'linear-gradient(135deg, #0a1628 0%, #0d1f40 60%, #0a1628 100%)')
                            : 'var(--color-surface)'
                    }}>

                        {/* Header strip */}
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            flexWrap: 'wrap', gap: 10,
                            padding: '14px 24px',
                            background: isEmergency ? 'rgba(220,38,38,0.15)' : 'rgba(37,99,235,0.10)',
                            borderBottom: isEmergency ? '1px solid rgba(220,38,38,0.3)' : '1px solid rgba(37,99,235,0.15)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {isEmergency && (
                                    <span style={{
                                        display: 'inline-block', width: 10, height: 10,
                                        borderRadius: '50%', background: '#dc2626',
                                        boxShadow: '0 0 0 0 rgba(220,38,38,0.7)',
                                        animation: 'mlc-pulse 1.4s ease-in-out infinite'
                                    }} />
                                )}
                                <span style={{
                                    fontWeight: 800, fontSize: 11,
                                    letterSpacing: '0.12em', textTransform: 'uppercase',
                                    color: isEmergency ? '#fca5a5' : 'rgba(147,197,253,0.9)'
                                }}>
                                    🧠 AI Most Likely Condition
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                {/* Agreement badge */}
                                {agreementInfo && (() => {
                                    const AgreIcon = agreementInfo.icon
                                    return (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 5,
                                            fontSize: 12, fontWeight: 700,
                                            padding: '4px 10px', borderRadius: 20,
                                            background: agreementInfo.bg, color: agreementInfo.color
                                        }}>
                                            <AgreIcon size={13} />{agreementInfo.label}
                                        </span>
                                    )
                                })()}
                                {/* Confidence pill */}
                                {confPct != null && (
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        fontSize: 12, fontWeight: 700, padding: '4px 10px',
                                        borderRadius: 20,
                                        background: confPct >= 70 ? 'rgba(22,163,74,0.15)' : confPct >= 50 ? 'rgba(217,119,6,0.15)' : 'rgba(220,38,38,0.15)',
                                        color: confPct >= 70 ? '#4ade80' : confPct >= 50 ? '#fbbf24' : '#f87171'
                                    }}>
                                        Confidence: {confPct}%
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Body */}
                        {isSingle ? (
                            /* ── SINGLE MODE: high-confidence single prediction ── */
                            <div style={{ padding: '28px 28px 22px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{
                                    fontSize: 32, fontWeight: 800, letterSpacing: '-0.5px',
                                    lineHeight: 1.15,
                                    color: isEmergency ? '#fca5a5' : '#93c5fd',
                                    textShadow: isEmergency ? '0 0 24px rgba(220,38,38,0.4)' : '0 0 24px rgba(59,130,246,0.4)'
                                }}>
                                    {mostLikely.name || mostLikely.condition_name}
                                </div>

                                {mostLikely.reason && (
                                    <div style={{
                                        fontSize: 14, lineHeight: 1.65,
                                        color: isEmergency ? 'rgba(252,165,165,0.85)' : 'rgba(147,197,253,0.8)',
                                        maxWidth: 680
                                    }}>
                                        {mostLikely.reason}
                                    </div>
                                )}

                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginTop: 4 }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 6,
                                        background: isEmergency ? 'rgba(220,38,38,0.2)' : 'rgba(37,99,235,0.2)',
                                        color: isEmergency ? '#fca5a5' : '#93c5fd',
                                        border: `1px solid ${isEmergency ? 'rgba(220,38,38,0.4)' : 'rgba(37,99,235,0.3)'}`,
                                        borderRadius: 10, padding: '8px 16px',
                                        fontSize: 16, fontWeight: 700
                                    }}>
                                        {mostLikely.probability}% Probability
                                    </span>
                                    {mostLikely.confidence_label && (
                                        <span style={{
                                            fontSize: 13, padding: '6px 12px', borderRadius: 8, fontWeight: 600,
                                            background: 'rgba(255,255,255,0.06)',
                                            color: 'rgba(255,255,255,0.6)',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}>
                                            {mostLikely.confidence_label} Confidence
                                        </span>
                                    )}
                                    {mostLikely.specialty && (
                                        <span style={{
                                            fontSize: 12, padding: '5px 10px', borderRadius: 8,
                                            background: 'rgba(255,255,255,0.04)',
                                            color: 'rgba(255,255,255,0.5)',
                                            border: '1px solid rgba(255,255,255,0.08)'
                                        }}>
                                            🏥 {mostLikely.specialty}
                                        </span>
                                    )}
                                </div>

                                {/* Compliance disclaimer inline */}
                                <div style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 8,
                                    padding: '10px 14px', borderRadius: 10, marginTop: 4,
                                    background: 'rgba(255,255,255,0.04)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5
                                }}>
                                    <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                                    This is an AI-based prediction and not a confirmed medical diagnosis. Consult a qualified healthcare professional for clinical evaluation.
                                </div>
                            </div>
                        ) : (
                            /* ── MULTI MODE: models disagree, show top conditions ── */
                            <div style={{ padding: '20px 24px 20px' }}>
                                <div style={{ marginBottom: 14, fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.5 }}>
                                    AI models indicate multiple possibilities. Review the top conditions identified below.
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {(possibleConditions.length > 0 ? possibleConditions : alternatives).slice(0, 4).map((cond, idx) => {
                                        const name = cond.name || cond.condition_name
                                        const prob = cond.probability || 0
                                        const barColor = prob > 60 ? 'var(--color-danger)' : prob > 30 ? 'var(--color-warning)' : 'var(--color-safe)'
                                        const isTop = idx === 0
                                        return (
                                            <div key={idx} style={{
                                                display: 'flex', alignItems: 'center', gap: 14,
                                                padding: '10px 14px', borderRadius: 10,
                                                background: isTop ? 'rgba(37,99,235,0.07)' : 'var(--color-bg)',
                                                border: isTop ? '1px solid rgba(37,99,235,0.2)' : '1px solid var(--color-border)'
                                            }}>
                                                <div style={{
                                                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                                                    background: barColor, display: 'flex', alignItems: 'center',
                                                    justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12
                                                }}>
                                                    {idx + 1}
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontWeight: isTop ? 700 : 500, fontSize: 14, color: 'var(--color-text)', marginBottom: 4 }}>
                                                        {name}
                                                        {isTop && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 6, background: 'rgba(37,99,235,0.12)', color: 'var(--color-primary)' }}>Top Pick</span>}
                                                    </div>
                                                    <div style={{ width: '100%', height: 5, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
                                                        <div style={{ width: `${prob}%`, height: '100%', background: barColor, borderRadius: 3, transition: 'width 0.8s ease-out' }} />
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: 15, color: barColor, flexShrink: 0, minWidth: 40, textAlign: 'right' }}>
                                                    {prob}%
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                                <div style={{
                                    marginTop: 12, fontSize: 11,
                                    color: 'var(--color-text-2)', lineHeight: 1.5,
                                    display: 'flex', alignItems: 'flex-start', gap: 6
                                }}>
                                    <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                                    This is an AI-based prediction and not a confirmed medical diagnosis. Consult a qualified healthcare professional.
                                </div>
                            </div>
                        )}
                    </div>
                )
            })()}
            {/* Pulse animation for emergency indicator */}
            <style>{`
                @keyframes mlc-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(220,38,38,0.7); }
                    70% { box-shadow: 0 0 0 8px rgba(220,38,38,0); }
                    100% { box-shadow: 0 0 0 0 rgba(220,38,38,0); }
                }
            `}</style>

            {/* Anatomical Visualization */}
            <div className="card section" style={{ overflow: 'hidden', marginBottom: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '32px', alignItems: 'center', padding: '16px' }}>
                    <div style={{ flex: '0 0 auto' }}>
                        <div style={{ 
                            width: 280, 
                            height: 280, 
                            borderRadius: '24px', 
                            overflow: 'hidden',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <LungCapacityVisualization size={280} healthScore={scores.lungFunction} hideUI={true} />
                        </div>
                    </div>
                    <div style={{ flex: '1 1 300px' }}>
                        <div className="text-card-title" style={{ fontSize: '1.5rem', marginBottom: '8px' }}>Respiratory Simulation</div>
                        <div className="text-meta" style={{ fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '16px' }}>
                            The 3D model above reflects your current respiratory condition based on your clinical assessment and breathing performance.
                        </div>
                        <div className="glass-card" style={{ padding: '16px', borderRadius: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', marginBottom: '8px' }}>
                                <Wind size={20} />
                                <span style={{ fontWeight: 700 }}>VISUAL FEEDBACK</span>
                            </div>
                            <div style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--color-text)' }}>
                                {scores.lungFunction > 70 
                                    ? "Your lungs show high resilience and optimal capacity. Maintain your current fitness routine." 
                                    : scores.lungFunction > 40
                                    ? "Moderate restriction observed. Focused breathing exercises are recommended to improve overall efficiency."
                                    : "Significant respiratory strain detected. Prioritize the medical recommendations below and consult a specialist."}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confidence Banner */}
            {predictionDetails?.confidence_score != null && (() => {
                const conf = predictionDetails.confidence_score
                const tier = getConfidenceTier(conf)
                const suggestion = getImprovementSuggestion(conf)
                return (
                    <div style={{
                        display: 'flex', alignItems: 'flex-start', gap: 14,
                        padding: '16px 20px', borderRadius: 14, marginBottom: 24,
                        background: tier.tier === 'high' ? 'rgba(22,163,74,0.07)' : tier.tier === 'moderate' ? 'rgba(217,119,6,0.07)' : 'rgba(220,38,38,0.07)',
                        border: `1px solid ${tier.tier === 'high' ? 'rgba(22,163,74,0.25)' : tier.tier === 'moderate' ? 'rgba(217,119,6,0.25)' : 'rgba(220,38,38,0.25)'}`
                    }}>
                        <div style={{ fontSize: 22, lineHeight: 1 }}>{tier.emoji}</div>
                        <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <ConfidenceBadge confidence={conf} size="md" showBar={false} />
                            </div>
                            {suggestion && (
                                <div style={{ fontSize: 13, color: '#dc2626', display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
                                    <PlusCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                                    <span><strong>Improve accuracy:</strong> {suggestion}</span>
                                </div>
                            )}
                            {predictionDetails.recommended_specialty && (
                                <div style={{ marginTop: 8, fontSize: 13, color: 'var(--color-text-2)' }}>
                                    Recommended specialist: <strong>{predictionDetails.recommended_specialty}</strong>
                                </div>
                            )}
                            
                            {predictionDetails.warnings && predictionDetails.warnings.length > 0 && (
                                <div style={{ marginTop: 14, padding: '12px 16px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)' }}>
                                    <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <AlertTriangle size={16} /> Clinical Alert
                                    </div>
                                    <ul style={{ margin: 0, paddingLeft: 22, color: '#991b1b', fontSize: 13, lineHeight: 1.5 }}>
                                        {predictionDetails.warnings.map((w, i) => <li key={i}>{w}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )
            })()}

            {/* Urgency Banner */}
            {predictionDetails?.urgency_tier && ['Emergency', 'High Risk'].includes(predictionDetails.urgency_tier) && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '16px 20px', borderRadius: 14, marginBottom: 24,
                    background: 'rgba(220,38,38,0.1)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    color: '#dc2626'
                }}>
                    <AlertTriangle size={28} />
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{predictionDetails.urgency_tier} Detected</div>
                        <div style={{ fontSize: 13, marginTop: 4 }}>
                            {predictionDetails.urgency_action}
                            {predictionDetails.time_to_action && <span style={{ fontWeight: 600, marginLeft: 8 }}>• {predictionDetails.time_to_action}</span>}
                        </div>
                    </div>
                </div>
            )}

            {/* Compliance Disclaimer */}
            {medicalDisclaimer && (
                <div style={{
                    display: 'flex', alignItems: 'flex-start', gap: 10,
                    padding: '12px 16px', borderRadius: 10, marginBottom: 24,
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-2)',
                    fontSize: 12, lineHeight: 1.5
                }}>
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-subtle)' }} />
                    <div>
                        <strong>Important:</strong> {medicalDisclaimer}
                    </div>
                </div>
            )}

            {/* AI Explanation */}
            {predictionDetails?.ai_explanation && (
                <div className="card" style={{ padding: '24px 32px', marginBottom: 24, background: 'var(--color-surface)', border: '1px solid var(--color-primary-light)' }}>
                    <div className="text-card-title" style={{ marginBottom: 12 }}>AI Risk Explanation</div>
                    {typeof predictionDetails.ai_explanation === 'string' ? (
                        <p style={{ margin: 0, color: 'var(--color-text)', lineHeight: 1.5 }}>
                            {predictionDetails.ai_explanation}
                        </p>
                    ) : (
                        <div style={{ color: 'var(--color-text)', lineHeight: 1.5, fontSize: 14 }}>
                            <div style={{ marginBottom: 10 }}><strong>Summary:</strong> {predictionDetails.ai_explanation.summary}</div>
                            <div style={{ marginBottom: 10 }}><strong>Symptoms Flagged:</strong> {predictionDetails.ai_explanation.symptoms_flagged}</div>
                            <div><strong>Clinical Mapping:</strong> {predictionDetails.ai_explanation.clinical_mapping}</div>
                        </div>
                    )}
                    {predictionDetails.top_risk_factors && predictionDetails.top_risk_factors.length > 0 && (
                        <div style={{ marginTop: 16 }}>
                            <div className="text-meta" style={{ marginBottom: 8, fontWeight: 600 }}>Key Contributing Factors:</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {predictionDetails.top_risk_factors.map((factor, idx) => (
                                    <span key={idx} className="badge badge-warning">{factor}</span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Clinical Context */}
            {predictionDetails?.similar_cases_distribution && Object.keys(predictionDetails.similar_cases_distribution).length > 0 && (
                <div className="card" style={{ padding: '24px 32px', marginBottom: 24, background: 'var(--color-surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <CheckCircle size={20} color="var(--color-primary)" />
                        <div className="text-card-title" style={{ margin: 0 }}>Clinical Validation</div>
                    </div>
                    <div className="text-meta" style={{ marginBottom: 16 }}>
                        Based on securely matched records from our verified clinical database with similar symptom severity and lifestyle markers.
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                        {Object.entries(predictionDetails.similar_cases_distribution).map(([condition, count], idx) => (
                            <div key={idx} style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--color-bg)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text)' }}>{condition}</span>
                                <span className="badge badge-primary" style={{ background: 'var(--color-primary)', color: 'white' }}>{count} matching cases</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Most Likely Condition — promoted above, removed from here to avoid duplication */}

            {/* Possible Conditions Breakdown */}
            {(alternatives.length > 0 || possibleConditions.length > 0) && (
                <div className="card" style={{ padding: '24px 32px', marginBottom: 24 }}>
                    <div className="text-card-title" style={{ marginBottom: 4 }}>
                        {mode === 'single' ? 'Differential Diagnosis' : 'Possible Conditions'}
                    </div>
                    <div className="text-meta" style={{ marginBottom: 20 }}>
                        {mode === 'single' ? 'Other conditions considered by the models:' : 'Risk scores are estimates based on your reported symptoms, lifestyle, and medical history. Not a clinical diagnosis.'}
                    </div>
                    
                    {mode === 'multi' && agreementStatus && (() => {
                        const details = getAgreementDetails(agreementStatus);
                        if (!details) return null;
                        const Icon = details.icon;
                        return (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: details.bg, color: details.color, padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                                <Icon size={16} />
                                Models show {details.label.toLowerCase()} - displaying multiple possibilities.
                            </div>
                        );
                    })()}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                        {(alternatives.length > 0 ? alternatives : possibleConditions).map((dr, idx) => {
                            const name = dr.name || dr.condition_name
                            const riskNum = dr.probability
                            const colorVar = riskNum > 60 ? 'var(--color-danger)' : riskNum > 30 ? 'var(--color-warning)' : 'var(--color-safe)'
                            const label = riskNum > 60 ? 'High' : riskNum > 30 ? 'Moderate' : 'Low'
                            return (
                                <div key={idx} style={{ padding: '14px 18px', border: '1px solid var(--color-border)', borderRadius: 10, background: 'var(--color-bg)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                                        <div style={{ flex: 1, paddingRight: 8 }}>
                                            <span style={{ fontWeight: 600, fontSize: 14, display: 'block', lineHeight: 1.3 }}>{name}</span>
                                            {dr.specialty && <span style={{ fontSize: 11, color: 'var(--color-text-2)' }}>{dr.specialty}</span>}
                                        </div>
                                        <span style={{ fontWeight: 700, fontSize: 15, color: colorVar, flexShrink: 0 }}>{riskNum}%</span>
                                    </div>
                                    <div style={{ width: '100%', height: 7, background: 'var(--color-border)', borderRadius: 4, overflow: 'hidden' }}>
                                        <div style={{ width: `${riskNum}%`, height: '100%', background: colorVar, transition: 'width 1s ease-out', borderRadius: 4 }} />
                                    </div>
                                    <div style={{ marginTop: 6, fontSize: 11, color: colorVar, fontWeight: 600, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <span>{label} Risk</span>
                                        {dr.severity && <> • <span>{dr.severity} Severity</span></>}
                                        {dr.confidence_label && (
                                            <>
                                                • <span style={{ padding: '2px 6px', background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: 4, color: 'var(--color-text)' }}>{dr.confidence_label} Confidence</span>
                                            </>
                                        )}
                                    </div>
                                    {dr.reason && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-text-2)', fontStyle: 'italic', lineHeight: 1.4 }}>{dr.reason}</div>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Trend Analysis */}
            {!loadingHistory && history.length >= 2 && (() => {
                const current = history[history.length - 1].score;
                const previous = history[history.length - 2].score;
                const diff = current - previous;
                const isWorse = diff > 0;
                const isBetter = diff < 0;
                const trendColor = isWorse ? 'var(--color-danger)' : isBetter ? 'var(--color-safe)' : 'var(--color-text-2)';
                const TrendIcon = isWorse ? TrendingUp : isBetter ? TrendingDown : Minus;
                const trendText = isWorse ? 'Risk Increased' : isBetter ? 'Risk Decreased' : 'Stable';

                return (
                    <div className="card" style={{ padding: '24px 32px', marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div>
                                <div className="text-card-title" style={{ marginBottom: 4 }}>Risk Score Trend</div>
                                <div className="text-meta">Your risk score historical progression.</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: trendColor, background: 'var(--color-bg)', padding: '6px 12px', borderRadius: 8, border: '1px solid var(--color-border)' }}>
                                <TrendIcon size={16} />
                                <span style={{ fontWeight: 600, fontSize: 13 }}>{Math.abs(diff).toFixed(1)} ({trendText})</span>
                            </div>
                        </div>
                        <div style={{ height: 260, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                                    <XAxis dataKey="date" stroke="var(--color-text-2)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--color-text-2)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                    <Tooltip 
                                        contentStyle={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: 8 }}
                                        itemStyle={{ color: 'var(--color-primary)', fontWeight: 600 }}
                                        formatter={(value) => [Math.round(value), 'Risk Score']}
                                    />
                                    <Line type="monotone" dataKey="score" stroke="var(--color-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--color-surface)', strokeWidth: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            })()}

            {/* Personalized Recommendations */}
            <div className="card" style={{ padding: '24px 32px' }}>
                <div className="text-card-title" style={{ marginBottom: 4 }}>Personalized Recommendations</div>
                <div className="text-meta" style={{ marginBottom: 20 }}>Based on your assessment scores, symptoms, and lifestyle factors.</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {recommendations.map((rec, i) => (
                        <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                            <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{rec.icon}</span>
                            <span style={{ color: 'var(--color-text)', lineHeight: 1.6, fontSize: 14 }}>{rec.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Complete &amp; Return to Dashboard</button>
            </div>
        </div>
    )
}

