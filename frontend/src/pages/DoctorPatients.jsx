import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Loader, Users } from 'lucide-react'
import { api } from '../utils/api'

const riskBadge = (r) => r === 'High' ? 'badge-danger' : r === 'Moderate' ? 'badge-warning' : r === 'Low' ? 'badge-safe' : ''

export default function DoctorPatients() {
    const [patients, setPatients] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('All')

    useEffect(() => {
        async function load() {
            try {
                const res = await api.auth.listPatients()
                setPatients(res?.patients || [])
            } catch (err) {
                console.error('DoctorPatients: failed to load patients', err)
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    const filtered = patients.filter(p => {
        const name = p.email?.split('@')[0] || ''
        const matchSearch = name.toLowerCase().includes(search.toLowerCase()) ||
            (p.email || '').toLowerCase().includes(search.toLowerCase())
        const matchFilter = filter === 'All'
        return matchSearch && matchFilter
    })

    return (
        <div className="page-enter">
            <div className="page-header">
                <div className="page-header-row">
                    <div>
                        <div className="text-label">Clinical Management</div>
                        <h1 className="text-page-title" style={{ marginTop: 4 }}>Patients</h1>
                    </div>
                    {!loading && <div className="text-meta">{filtered.length} of {patients.length} patients</div>}
                </div>
            </div>

            {/* Controls */}
            <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', padding: '14px 20px' }}>
                <div className="dp-search" style={{ flex: 1 }}>
                    <Search size={14} color="var(--color-subtle)" />
                    <input type="text" placeholder="Search by name or email…" className="dp-search-input"
                        style={{ width: '100%' }} value={search} onChange={e => setSearch(e.target.value)} aria-label="Search patients" />
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {['All'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-outline'}`}>{f}</button>
                    ))}
                </div>
            </div>

            {loading && (
                <div className="card" style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
                    <Loader size={24} style={{ display: 'block', margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
                    <div style={{ fontWeight: 600 }}>Loading patients...</div>
                </div>
            )}

            {!loading && patients.length === 0 && (
                <div className="card" style={{ padding: '48px 40px', textAlign: 'center' }}>
                    <Users size={48} style={{ color: 'var(--color-primary)', display: 'block', margin: '0 auto 20px' }} />
                    <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>No Patients Yet</div>
                    <div className="text-meta" style={{ maxWidth: 380, margin: '0 auto' }}>
                        No patients have registered in the system yet.
                    </div>
                </div>
            )}

            {!loading && patients.length > 0 && (
                <div className="card">
                    <table className="dp-table">
                        <thead>
                            <tr>
                                <th>Patient</th><th>Email</th><th>Role</th><th>Joined</th><th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => (
                                <tr key={p.id}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 13 }}>
                                            {p.email?.split('@')[0] || p.id?.slice(0, 8)}
                                        </div>
                                        <div className="text-meta" style={{ fontSize: 11 }}>{p.id?.slice(0, 8)}</div>
                                    </td>
                                    <td className="text-meta">{p.email}</td>
                                    <td>
                                        <span className="badge badge-safe">{p.role || 'patient'}</span>
                                    </td>
                                    <td className="text-meta" style={{ whiteSpace: 'nowrap' }}>
                                        {p.created_at ? new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '–'}
                                    </td>
                                    <td>
                                        <Link to={`/doctor/patient-profile/${p.id}`} className="btn btn-outline btn-sm">Profile</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-muted)' }}>
                            No patients match your search.
                        </div>
                    )}
                </div>
            )}

            <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .dp-search { display:flex; align-items:center; gap:8px; background:var(--color-bg); border:1px solid var(--color-border); border-radius:var(--radius-full); padding:7px 14px; }
        .dp-search-input { border:none; background:transparent; outline:none; font-size:13px; color:var(--color-text); }
        .dp-search-input::placeholder { color:var(--color-subtle); }
        .dp-table { width:100%; border-collapse:collapse; font-size:13px; }
        .dp-table thead tr { border-bottom:1px solid var(--color-border); }
        .dp-table th { text-align:left; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.6px; color:var(--color-subtle); padding:0 12px 10px 0; white-space:nowrap; }
        .dp-table td { padding:12px 12px 12px 0; border-bottom:1px solid var(--color-border); vertical-align:middle; }
        .dp-table tbody tr:last-child td { border-bottom:none; }
        .dp-table tbody tr:hover { background:var(--color-bg); }
      `}</style>
        </div>
    )
}
