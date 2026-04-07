import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import TrustTag from '../components/TrustTag'
import { Users, AlertTriangle, FileText, UserCheck, Loader, MessageSquare, X } from 'lucide-react'
import { api } from '../utils/api'
import { toast } from 'react-toastify'

const riskBadge = (r) => r === 'High' ? 'badge-danger' : r === 'Moderate' ? 'badge-warning' : 'badge-safe'

function deriveRisk(patient) {
    // If no explicit risk, derive from role or default
    if (patient.risk_category) return String(patient.risk_category)
    return 'Unknown'
}

export default function DoctorDashboard() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [patientFilter, setPatientFilter] = useState('All')
    const [appointments, setAppointments] = useState([])
    const prevPendingCount = useRef(0)

    const fetchAppointments = async () => {
        try {
            const appts = await api.appointments.getForDoctor()
            const list = appts?.appointments || []
            const pendingNow = list.filter(a => a.status === 'pending').length
            if (prevPendingCount.current > 0 && pendingNow > prevPendingCount.current) {
                toast.info(`📋 New patient connection request received!`)
            }
            prevPendingCount.current = pendingNow
            setAppointments(list)
        } catch (err) {
            console.error('Failed to load appointments', err)
        }
    }

    useEffect(() => {
        async function load() {
            try {
                const res = await api.auth.listPatients()
                setPatients(res?.patients || [])
                await fetchAppointments()
            } catch (err) {
                console.error('Doctor dashboard: failed to load data', err)
            } finally {
                setLoading(false)
            }
        }
        load()
        // Poll every 10 seconds for new requests
        const interval = setInterval(fetchAppointments, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleAccept = async (id) => {
        try {
            await api.appointments.accept(id)
            toast.success('✅ Connection accepted! You can now chat with the patient.')
            await fetchAppointments()
        } catch(e) {
            toast.error('Failed to accept request.')
            console.error(e)
        }
    }

    const handleDecline = async (id) => {
        // Optimistically remove from list (no backend endpoint needed for basic decline)
        setAppointments(prev => prev.filter(a => a.id !== id))
        toast.info('Request declined.')
    }

    const filteredPatients = patients.filter(p => {
        if (patientFilter === 'All') return true
        return deriveRisk(p) === patientFilter
    })

    const highRisk = patients.filter(p => deriveRisk(p) === 'High' || (p.risk || '').toLowerCase() === 'high').length
    const totalPatients = patients.length
    const pendingAppointments = appointments.filter(a => a.status === 'pending')
    const activeChats = appointments.filter(a => a.status === 'accepted').length

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Clinical Overview</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Doctor Dashboard</h1>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <TrustTag type="doctor" />
                    </div>
                </div>
            </div>

            {/* Summary stat cards */}
            <div className="dd-stats-row" style={{ marginBottom: 20 }}>
                {[
                    { icon: Users, label: 'Total Patients', value: loading ? '–' : String(totalPatients), sub: 'Registered patients' },
                    { icon: AlertTriangle, label: 'High Risk', value: loading ? '–' : String(highRisk), sub: 'Requires attention', color: 'var(--color-danger)' },
                    { icon: FileText, label: 'Connection Requests', value: loading ? '–' : String(pendingAppointments.length), sub: 'Awaiting your approval', pulse: pendingAppointments.length > 0 },
                    { icon: MessageSquare, label: 'Active Chats', value: loading ? '–' : String(activeChats), sub: 'Connected patients' },
                ].map(s => (
                    <div key={s.label} className="card dd-stat-card" style={{ position: 'relative' }}>
                        {s.pulse && (
                            <span className="dd-pulse-badge">NEW</span>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 32, height: 32, background: s.color ? 'var(--color-danger-light)' : 'var(--color-primary-light)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <s.icon size={16} color={s.color || 'var(--color-primary)'} />
                            </div>
                            <div className="text-meta">{s.label}</div>
                        </div>
                        <div style={{ fontSize: 26, fontWeight: 700, color: s.color || 'var(--color-text)', lineHeight: 1 }}>{s.value}</div>
                        <div className="text-meta" style={{ marginTop: 5 }}>{s.sub}</div>
                    </div>
                ))}
            </div>

            {loading && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Loader size={24} style={{ display: 'block', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 600 }}>Loading patients...</div>
                </div>
            )}

            {!loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* Patient Connection Requests */}
                    <div className="card" style={{ padding: 20 }}>
                        <div className="card-header" style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="text-card-title">Patient Connection Requests</div>
                                {pendingAppointments.length > 0 && (
                                    <span className="dd-pulse-badge" style={{ position: 'static', transform: 'none', fontSize: 10 }}>
                                        {pendingAppointments.length} PENDING
                                    </span>
                                )}
                            </div>
                            <div className="text-meta" style={{ fontSize: 11, marginTop: 2 }}>Refreshes automatically every 10 seconds</div>
                        </div>
                        {appointments.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--color-muted)' }}>
                                <FileText size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.3 }} />
                                <div style={{ fontWeight: 600, marginBottom: 6 }}>No connection requests yet</div>
                                <div style={{ fontSize: 13 }}>When patients connect to you through the Risk Analysis page, their requests appear here in real-time.</div>
                            </div>
                        ) : (
                            <table className="dd-table">
                                <thead>
                                    <tr>
                                        <th>Patient</th>
                                        <th>Health Concern</th>
                                        <th>Date Requested</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appointments.map(a => (
                                        <tr key={a.id} style={{ background: a.status === 'pending' ? 'rgba(var(--color-warning-rgb, 255,165,0), 0.04)' : 'transparent' }}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{a.patient_name || a.patient_id?.slice(0, 8)}</div>
                                                <div className="text-meta" style={{ fontSize: 11 }}>ID: {a.patient_id?.slice(0, 8)}</div>
                                            </td>
                                            <td style={{ color: 'var(--color-text)' }}>{a.disease}</td>
                                            <td className="text-meta">
                                                {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <span className={`badge ${a.status === 'pending' ? 'badge-warning' : 'badge-safe'}`}>
                                                    {a.status === 'pending' ? '⏳ Pending' : '✅ Accepted'}
                                                </span>
                                            </td>
                                            <td>
                                                {a.status === 'pending' ? (
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => handleAccept(a.id)} className="btn btn-primary btn-sm">Accept</button>
                                                        <button onClick={() => handleDecline(a.id)} className="btn btn-outline btn-sm" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                                                            <X size={12} style={{ display: 'inline', marginRight: 3 }} />Decline
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Link to={`/chat/${a.id}?role=doctor`} className="btn btn-primary btn-sm">💬 Chat</Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    


                <div className="dd-anchor-row">
                    {/* Patient table */}
                    <div className="card">
                        <div className="card-header" style={{ alignItems: 'center', marginBottom: 16 }}>
                            <div className="text-card-title">All Patients</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {['All', 'High', 'Moderate', 'Low'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setPatientFilter(f)}
                                        className={`btn btn-sm ${patientFilter === f ? 'btn-primary' : 'btn-outline'}`}
                                        style={{ padding: '4px 10px', fontSize: 12 }}
                                    >
                                        {f}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <table className="dd-table">
                            <thead>
                                <tr>
                                    <th>Patient</th><th>Email</th><th>Role</th><th>Joined</th><th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPatients.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-muted)' }}>No patients found.</td></tr>
                                ) : (
                                    filteredPatients.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                                {p.email?.split('@')[0] || p.id?.slice(0, 8)}
                                            </td>
                                            <td className="text-meta">{p.email}</td>
                                            <td>
                                                <span className="badge badge-safe">{p.role || 'patient'}</span>
                                            </td>
                                            <td className="text-meta">
                                                {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '–'}
                                            </td>
                                            <td>
                                                <Link to={`/doctor/patient-profile/${p.id}`} className="btn btn-outline btn-sm">View</Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Right sidebar summary */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div className="card">
                            <div className="card-header" style={{ marginBottom: 12 }}>
                                <div className="text-card-title" style={{ color: 'var(--color-danger)' }}>
                                    <AlertTriangle size={14} style={{ display: 'inline', marginRight: 6 }} />
                                    Patient Overview
                                </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--color-border)' }}>
                                    <span className="text-meta">Total Registered</span>
                                    <span style={{ fontWeight: 700 }}>{totalPatients}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                                    <span className="text-meta">High Risk</span>
                                    <span style={{ fontWeight: 700, color: 'var(--color-danger)' }}>{highRisk}</span>
                                </div>
                            </div>
                        </div>

                        <div className="card">
                            <div className="text-card-title" style={{ marginBottom: 12 }}>Quick Actions</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <Link to="/doctor/patients" className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                                    View All Patients
                                </Link>
                                <Link to="/doctor/alerts" className="btn btn-outline" style={{ justifyContent: 'flex-start', fontSize: 13 }}>
                                    View Alerts
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            )}

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse-badge { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.75; transform:scale(1.08); } }
        .dd-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        .dd-stat-card { display:flex; flex-direction:column; }
        .dd-pulse-badge { position:absolute; top:10px; right:10px; background:var(--color-danger); color:#fff; font-size:9px; font-weight:700; letter-spacing:0.8px; padding:2px 7px; border-radius:99px; text-transform:uppercase; animation: pulse-badge 1.6s ease-in-out infinite; }
        .dd-anchor-row { display:grid; grid-template-columns:1.6fr 1fr; gap:var(--sp-md); align-items:start; }
        .dd-table { width:100%; border-collapse:collapse; font-size:13px; }
        .dd-table thead tr { border-bottom:1px solid var(--color-border); }
        .dd-table th { text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; color:var(--color-subtle); padding:0 10px 10px 0; }
        .dd-table td { padding:10px 10px 10px 0; border-bottom:1px solid var(--color-border); vertical-align:middle; }
        .dd-table tbody tr:last-child td { border-bottom:none; }
        @media (max-width:900px) { .dd-anchor-row { grid-template-columns:1fr; } .dd-stats-row { grid-template-columns:repeat(2,1fr); } }
      `}</style>
        </div>
    )
}
