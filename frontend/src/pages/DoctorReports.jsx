import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import TrustTag from '../components/TrustTag'
import { Download, Share2, FileText, CheckCircle2, Loader } from 'lucide-react'
import { api } from '../utils/api'
import { toast } from 'react-toastify'

const riskBadge = (r) => r === 'Low' ? 'badge-safe' : r === 'Moderate' ? 'badge-warning' : 'badge-danger'

export default function DoctorReports() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [verifyingId, setVerifyingId] = useState(null)

    useEffect(() => {
        async function load() {
            try {
                const res = await api.reports.getDoctorReports()
                setReports(res || [])
            } catch (err) {
                console.error('DoctorReports: failed to load reports', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const handleVerify = async (reportId) => {
        if (verifyingId) return
        setVerifyingId(reportId)
        try {
            await api.reports.verify(reportId)
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'Reviewed' } : r))
            toast.success("Clinical Report Verified")
        } catch (err) {
            console.error('DoctorReports: verification failed', err)
        } finally {
            setVerifyingId(null)
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Clinical Documentation</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Patient Reports</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <TrustTag type="doctor" />
                        {!loading && <span className="text-meta">{reports.length} reports</span>}
                    </div>
                </div>
            </div>

            {loading && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Loader size={24} style={{ display: 'block', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 600 }}>Loading reports...</div>
                </div>
            )}

            {!loading && reports.length === 0 && (
                <div className="card" style={{ padding: '48px 40px', textAlign: 'center' }}>
                    <FileText size={48} style={{ color: 'var(--color-primary)', display: 'block', margin: '0 auto 20px' }} />
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Reports Yet</div>
                    <div className="text-meta" style={{ maxWidth: 380, margin: '0 auto' }}>
                        Reports will appear here when patients complete risk assessments.
                    </div>
                </div>
            )}

            {!loading && reports.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {reports.map(r => (
                        <div key={r.id} className="card" style={{ display: 'flex', alignItems: 'flex-start', gap: 18, padding: '20px 24px' }}>
                            <div style={{ width: 44, height: 44, background: 'var(--color-primary-light)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <FileText size={20} color="var(--color-primary)" />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10, gap: 12 }}>
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{r.type}</div>
                                        <div className="text-meta">Patient: {r.patient} {r.patient_email ? `(${r.patient_email})` : ''}</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
                                        <span className={`badge ${riskBadge(r.risk)}`}>{r.risk} Risk</span>
                                        <span className={`badge ${r.status === 'Reviewed' ? 'badge-safe' : 'badge-warning'}`}>
                                            {r.status === 'Reviewed' ? <CheckCircle2 size={11} style={{ display: 'inline', marginRight: 3 }} /> : null}
                                            {r.status}
                                        </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span className="text-label">Date</span>
                                        <span style={{ fontSize: 13 }}>
                                            {r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '–'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        <span className="text-label">Risk Score</span>
                                        <span style={{ fontWeight: 700, fontSize: 15 }}>{r.score}<span style={{ color: 'var(--color-subtle)', fontWeight: 400, fontSize: 12 }}>/100</span></span>
                                    </div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
                                {r.status === 'Pending Review' && (
                                    <button 
                                        onClick={() => handleVerify(r.id)} 
                                        className="btn btn-primary btn-sm"
                                        disabled={!!verifyingId}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        {verifyingId === r.id ? <Loader size={14} className="spin" /> : null}
                                        {verifyingId === r.id ? 'Signing...' : 'Sign & Verify'}
                                    </button>
                                )}
                                <Link to={`/doctor/patient-profile/${r.patient_id}`} className="btn btn-outline btn-sm">
                                    View Patient
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    )
}
