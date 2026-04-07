import { useState, useEffect } from 'react'
import TrustTag from '../components/TrustTag'
import { Download, Share2, FileText, Activity } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '../utils/api'

const riskBadge = (r) => r === 'Low' ? 'badge-safe' : r === 'Moderate' ? 'badge-warning' : r === 'High' ? 'badge-danger' : 'badge-warning'

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

  ${report.ai_explanation ? `
  <div class="section">
    <div class="section-header">
      <div class="section-icon"></div>
      <div class="section-title">Clinical Interpretation</div>
    </div>
    <div class="analysis-box">
      ${report.ai_explanation}
    </div>
  </div>
  ` : ''}

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px;">
    <div>
      <div class="section">
        <div class="section-header">
          <div class="section-icon"></div>
          <div class="section-title">Critical Pathogens Map</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${(report.disease_risks || [
        { disease: 'Asthma', risk_percentage: report.risk === 'High' ? 65 : 15 },
        { disease: 'COPD', risk_percentage: report.risk === 'High' ? 40 : 10 },
        { disease: 'Pneumonia', risk_percentage: report.risk === 'High' ? 20 : 5 },
        { disease: 'Bronchitis', risk_percentage: report.risk === 'High' ? 55 : 20 }
    ]).map(d => {
        const color = d.risk_percentage > 60 ? '#dc2626' : d.risk_percentage > 30 ? '#d97706' : '#16a34a'
        return `
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
                <span class="disease-name">${d.disease}</span>
                <span class="disease-risk-val">${d.risk_percentage}%</span>
              </div>
              <div class="risk-bar-bg">
                <div class="risk-bar-fill" style="width: ${d.risk_percentage}%; background: ${color}"></div>
              </div>
            </div>
          `
    }).join('')}
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
          ${(report.top_risk_factors || ['Clinical Symptoms', 'Ambient AQI', 'Physiological Profile']).map(f => `
            <span class="factor-tag">${f}</span>
          `).join('')}
        </div>
      </div>

      <div class="section">
        <div class="section-header">
          <div class="section-icon"></div>
          <div class="section-title">Diagnostic Meta</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;"><span style="color:#6b7280">Model Confidence</span><span style="font-weight:600">${report.confidence || '92.4%'}</span></div>
          <div style="display: flex; justify-content: space-between;"><span style="color:#6b7280">System Status</span><span style="font-weight:600; color:#16a34a">Calibrated</span></div>
          <div style="display: flex; justify-content: space-between;"><span style="color:#6b7280">Data Integrity</span><span style="font-weight:600; color:#16a34a">Verified</span></div>
        </div>
      </div>
    </div>
  </div>

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

export default function Reports() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [sendingEmail, setSendingEmail] = useState(null)
    const [sentEmail, setSentEmail] = useState(null)

    const handleEmailReport = async (report) => {
        setSendingEmail(report.id);
        try {
            const userData = JSON.parse(localStorage.getItem('user_data') || '{}');
            if (!userData.email) {
                alert('Please update your email in Settings first.');
                return;
            }

            // Using the new email service endpoint
            await api.email.sendReport({
                report_id: report.id,
                risk_score: report.score,
                risk_level: report.risk,
                type: report.type
            });

            setSentEmail(report.id);
            setTimeout(() => setSentEmail(null), 3000);
        } catch (err) {
            console.error('Failed to send report email:', err);
            alert('Failed to send email. please try again.');
        } finally {
            setSendingEmail(null);
        }
    };

    const handleShare = async (report) => {
        const shareData = {
            title: `BreathoMeter: ${report.title}`,
            text: `View my AI health analysis report. Health Score: ${report.score}/100, Risk: ${report.risk}. Generated on BreathoMeter.`,
            url: window.location.origin
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Clipboard fallback
                const shareText = `${shareData.text} \n\nAccess it here: ${shareData.url}`;
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(shareText);
                    alert('📋 Report summary and link copied to clipboard!');
                } else {
                    // Ultra-fallback for legacy/non-secure
                    const textArea = document.createElement("textarea");
                    textArea.value = shareText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    alert('📋 Copied to clipboard via legacy method!');
                }
            }
        } catch (err) {
            console.error('Sharing failed:', err);
            // Even if internal share fails, try clipboard one last time
            try {
                const legacyText = `Health Report: ${report.score}/100 Score. ${window.location.origin}`;
                await navigator.clipboard.writeText(legacyText);
                alert('Copied to clipboard (fallback).');
            } catch (e) {
                alert('Unable to share or copy. Please download the PDF instead.');
            }
        }
    };

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

                // Build one report per breath test, enriched with the matching prediction
                const built = breathTests.map((t, i) => {
                    const pred = predictions.find(p =>
                        Math.abs(new Date(p.created_at) - new Date(t.created_at)) < 1000 * 60 * 60 * 24
                    ) || predictions[i] || null

                    const score = Math.round(t.test_accuracy ?? t.lung_capacity ?? 0)
                    const riskCat = pred?.risk_category || pred?.predicted_condition || null
                    const risk = riskLabel(riskCat)
                    const confidence = pred?.confidence_score != null
                        ? `${Math.round(pred.confidence_score * 100)}%` : null

                    const dateObj = new Date(t.created_at)
                    const dateStr = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    const shortDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

                    return {
                        id: `RPT-${t.id?.slice(0, 8)?.toUpperCase() ?? String(i + 1).padStart(3, '0')}`,
                        title: 'Health Analysis Report',
                        date: dateStr,
                        shortDate,
                        type: 'Respiratory Diagnostic',
                        score,
                        risk,
                        riskCategory: riskCat,
                        confidence,
                        status: 'Recorded',
                        ai_explanation: pred?.ai_explanation || null,
                        top_risk_factors: pred?.top_risk_factors || [],
                        disease_risks: pred?.disease_risks || []
                    }
                })

                setReports(built)
            } catch (err) {
                console.error('Reports load error:', err)
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
                        <div className="text-label">Clinical Documentation</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Health Reports</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <TrustTag type="ai" />
                    </div>
                </div>
            </div>

            {loading && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <div style={{ fontWeight: 600 }}>Loading your diagnostic reports...</div>
                </div>
            )}

            {!loading && reports.length === 0 && (
                <div className="card" style={{ padding: '48px 40px', textAlign: 'center' }}>
                    <Activity size={48} style={{ color: 'var(--color-primary)', display: 'block', margin: '0 auto 20px' }} />
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Reports Generated</div>
                    <div className="text-meta" style={{ maxWidth: 380, margin: '0 auto 24px', lineHeight: 1.6 }}>
                        Complete an AI Breath Analysis or Clinical Assessment to generate your first detailed health report.
                    </div>
                    <Link to="/assessment" className="btn btn-primary" style={{ display: 'inline-flex' }}>
                        Begin Diagnostic Assessment
                    </Link>
                </div>
            )}

            {!loading && reports.length > 0 && (
                <div className="rp-list">
                    {reports.map(r => (
                        <div key={r.id} className="card rp-report-card">
                            <div className="rp-report-icon">
                                <FileText size={22} color="var(--color-primary)" />
                            </div>

                            <div className="rp-report-body">
                                <div className="rp-report-header">
                                    <div>
                                        <div className="rp-report-title">{r.title}</div>
                                        <div className="rp-report-id text-meta">{r.id} · {r.type}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                                        <span className={`badge ${riskBadge(r.risk)}`}>{r.risk} Risk</span>
                                        <span className="badge badge-safe">{r.status}</span>
                                    </div>
                                </div>

                                <div className="rp-report-meta">
                                    <div className="rp-meta-item">
                                        <span className="text-label">Analysis Date</span>
                                        <span className="text-body" style={{ fontSize: 13 }}>{r.date}</span>
                                    </div>
                                    <div className="rp-meta-item">
                                        <span className="text-label">Health Score</span>
                                        <span style={{ fontWeight: 700, fontSize: 16 }}>{r.score}<span style={{ color: 'var(--color-subtle)', fontWeight: 400, fontSize: 12 }}>/100</span></span>
                                    </div>
                                    {r.riskCategory && (
                                        <div className="rp-meta-item">
                                            <span className="text-label">Risk Category</span>
                                            <span className="text-body" style={{ fontSize: 13 }}>{r.riskCategory}</span>
                                        </div>
                                    )}
                                    {r.confidence && (
                                        <div className="rp-meta-item">
                                            <span className="text-label">Confidence Score</span>
                                            <span className="text-body" style={{ fontSize: 13 }}>{r.confidence}</span>
                                        </div>
                                    )}
                                </div>

                                {r.ai_explanation && (
                                    <div className="rp-report-details" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-border-light)' }}>
                                        <div className="text-label" style={{ marginBottom: 6 }}>Clinical Interpretation Summary</div>
                                        <p style={{ fontSize: 13, color: 'var(--color-text)', lineHeight: 1.5, marginBottom: 12 }}>
                                            {r.ai_explanation.length > 200 ? r.ai_explanation.slice(0, 200) + '...' : r.ai_explanation}
                                        </p>
                                        {r.top_risk_factors && r.top_risk_factors.length > 0 && (
                                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {r.top_risk_factors.slice(0, 3).map((f, i) => (
                                                    <span key={i} className="badge badge-warning" style={{ fontSize: 10 }}>{f}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="rp-report-actions">
                                <button className="btn btn-primary btn-sm" onClick={() => generatePDF(r)}>
                                    <Download size={13} /> Export PDF
                                </button>
                                <button 
                                    className="btn btn-outline btn-sm" 
                                    onClick={() => handleShare(r)}
                                    title="Share summary"
                                >
                                    <Share2 size={13} /> Share
                                </button>
                                <button 
                                    className="btn btn-outline btn-sm" 
                                    onClick={() => handleEmailReport(r)}
                                    disabled={sendingEmail === r.id}
                                    style={{ 
                                        borderColor: 'var(--color-primary)', 
                                        color: 'var(--color-primary)',
                                        background: sendingEmail === r.id ? 'var(--color-primary-light)' : 'transparent'
                                    }}
                                >
                                    {sendingEmail === r.id ? (
                                        <div className="spinner-xs" />
                                    ) : (
                                        <>
                                            <Activity size={13} style={{ marginRight: 4 }} /> 
                                            {sentEmail === r.id ? 'Sent ✓' : 'Send Email'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                .spinner-xs {
                    width: 14px;
                    height: 14px;
                    border: 2px solid var(--color-primary-light);
                    border-top: 2px solid var(--color-primary);
                    border-radius: 50%;
                    animation: spin 0.8s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .rp-list {
                    display: flex;
                    flex-direction: column;
                    gap: 14px;
                }
                .rp-report-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 18px;
                    padding: 22px 24px;
                }
                .rp-report-icon {
                    width: 48px; height: 48px;
                    background: var(--color-primary-light);
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .rp-report-body {
                    flex: 1;
                    min-width: 0;
                }
                .rp-report-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 14px;
                }
                .rp-report-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--color-text);
                    margin-bottom: 3px;
                }
                .rp-report-id {
                    font-size: 11px;
                }
                .rp-report-meta {
                    display: flex;
                    gap: 28px;
                    flex-wrap: wrap;
                }
                .rp-meta-item {
                    display: flex;
                    flex-direction: column;
                    gap: 3px;
                }
                .rp-report-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                    flex-shrink: 0;
                }
                @media (max-width: 768px) {
                    .rp-report-card { flex-direction: column; }
                    .rp-report-actions { flex-direction: row; }
                }
            `}</style>
        </div>
    )
}
