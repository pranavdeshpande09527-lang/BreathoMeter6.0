import { useState, useEffect } from 'react'
import { api } from '../utils/api'
import { toast } from 'react-toastify'

export default function DoctorSettings() {
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState({
        fname: '',
        lname: '',
        email: '',
        contact_email: '',
        phone: '',
        specialization: '',
        license: ''
    })

    // Password state
    const [passForm, setPassForm] = useState({ newPass: '', confirm: '' })
    const [passStatus, setPassStatus] = useState('idle') // idle | saving | success | error
    const [passError, setPassError] = useState('')

    // Notification preference state
    const NOTIF_DEFAULTS = [
        { id: 'critical_alerts', label: 'Critical patient alerts', desc: 'SpO2, FEV1 emergency thresholds', on: true },
        { id: 'report_reminders', label: 'Report reminders', desc: 'When reports await sign-off > 24h', on: true },
        { id: 'new_assignments', label: 'New patient assignments', desc: 'When a new patient is assigned to you', on: true },
        { id: 'weekly_summary', label: 'Weekly summary', desc: 'Your panel health summary every Monday', on: false },
    ]
    const [notifications, setNotifications] = useState(NOTIF_DEFAULTS)
    const [notifLoaded, setNotifLoaded] = useState(false)
    const [notifSaving, setNotifSaving] = useState(false)

    // ── Load profile + notifications on mount ─────────────────────────────
    useEffect(() => {
        // Load profile from backend
        api.auth.getProfile().then(res => {
            if (res?.user) {
                const u = res.user
                const p = u.profile || {}
                
                let fn = p.first_name || ''
                let ln = p.last_name || ''
                if (!fn && u.full_name) {
                    const parts = u.full_name.split(' ')
                    fn = parts[0] || ''
                    ln = parts.slice(1).join(' ') || ''
                }

                setProfile(prev => ({
                    ...prev,
                    fname: fn,
                    lname: ln,
                    email: u.email || p.email || '',
                    contact_email: p.contact_email || prev.contact_email,
                    phone: p.phone || prev.phone || '+91 00000 00000',
                    specialization: p.specialty || p.specialization || prev.specialization || 'Doctor',
                    license: p.license || prev.license || 'Pending'
                }))
            }
        }).catch(err => {
            console.error('Failed to parse user profile for doctor settings:', err)
        })

        // Load notification preferences from backend
        api.auth.getNotifications().then(res => {
            if (res?.preferences && Object.keys(res.preferences).length > 0) {
                setNotifications(prev => prev.map(n => ({
                    ...n,
                    on: n.id in res.preferences ? Boolean(res.preferences[n.id]) : n.on
                })))
            }
            setNotifLoaded(true)
        }).catch(() => { setNotifLoaded(true) })
    }, [])

    // ── Save Profile ──────────────────────────────────────────────────────
    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            await api.auth.updateProfile({
                first_name: profile.fname.trim() || null,
                last_name: profile.lname.trim() || null,
                contact_email: profile.contact_email.trim() || null,
                phone: profile.phone.trim() || null
            })

            const stored = localStorage.getItem('user_data')
            if (stored && stored !== 'undefined') {
                const parsed = JSON.parse(stored)
                parsed.first_name = profile.fname
                parsed.last_name = profile.lname
                parsed.contact_email = profile.contact_email
                parsed.full_name = `${profile.fname} ${profile.lname}`.trim()
                parsed.phone = profile.phone
                localStorage.setItem('user_data', JSON.stringify(parsed))
            }
            toast.success("Profile saved successfully!")
        } catch (e) {
            toast.error(e.message || "Failed to save profile")
        } finally {
            setSaving(false)
        }
    }

    // ── Toggle + auto-save notification ───────────────────────────────────
    const toggleNotification = async (id) => {
        const updated = notifications.map(n => n.id === id ? { ...n, on: !n.on } : n)
        setNotifications(updated)
        if (!notifLoaded) return
        setNotifSaving(true)
        const prefsMap = Object.fromEntries(updated.map(n => [n.id, n.on]))
        try {
            await api.auth.updateNotifications(prefsMap)
        } catch (e) {
            // Revert on failure
            setNotifications(notifications)
            toast.error("Failed to save notification preference")
        } finally {
            setNotifSaving(false)
        }
    }

    // ── Change Password ───────────────────────────────────────────────────
    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        if (!passForm.newPass || passForm.newPass.length < 8) {
            setPassError('New password must be at least 8 characters.')
            return
        }
        if (passForm.newPass !== passForm.confirm) {
            setPassError('Passwords do not match.')
            return
        }
        setPassStatus('saving')
        setPassError('')
        try {
            await api.auth.changePassword(passForm.newPass)
            setPassStatus('success')
            setPassForm({ newPass: '', confirm: '' })
            setTimeout(() => setPassStatus('idle'), 3000)
        } catch (err) {
            setPassStatus('error')
            setPassError(err.message || 'Failed to update password. Please try again.')
        }
    }

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1 className="text-page-title">Settings</h1>
            </div>

            {/* Profile */}
            <div className="card section">
                <div className="text-card-title" style={{ marginBottom: 20 }}>Doctor Profile</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    {[
                        { id: 'dr-fname', label: 'First Name', value: profile.fname, type: 'text', stateKey: 'fname' },
                        { id: 'dr-lname', label: 'Last Name', value: profile.lname, type: 'text', stateKey: 'lname' },
                        { id: 'dr-email', label: 'Login Email', value: profile.email, type: 'email', stateKey: 'email', disabled: true },
                        { id: 'dr-contact-email', label: 'Notification Email', value: profile.contact_email, type: 'email', stateKey: 'contact_email', placeholder: 'your@gmail.com' },
                        { id: 'dr-phone', label: 'Phone', value: profile.phone, type: 'tel', stateKey: 'phone' },
                        { id: 'dr-spec', label: 'Specialization', value: profile.specialization, type: 'text', stateKey: 'specialization', disabled: true },
                        { id: 'dr-lic', label: 'License No.', value: profile.license, type: 'text', stateKey: 'license', disabled: true },
                    ].map(f => (
                        <div key={f.id} className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor={f.id}>{f.label}</label>
                            <input id={f.id} type={f.type} className="form-input" disabled={f.disabled} defaultValue={f.value} placeholder={f.placeholder} key={`${f.id}-${f.value}`} onChange={(e) => {
                                setProfile(p => ({...p, [f.stateKey]: e.target.value}))
                            }} />
                        </div>
                    ))}
                </div>
                <button
                    className="btn btn-primary"
                    style={{ marginTop: 20 }}
                    onClick={handleSaveProfile}
                    disabled={saving}
                >
                    {saving ? "Saving..." : "Save Profile"}
                </button>
            </div>

            {/* Notification Preferences */}
            <div className="card section">
                <div className="text-card-title" style={{ marginBottom: 16 }}>Notification Preferences</div>
                {notifications.map(n => (
                    <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                            <div className="text-meta">{n.desc}</div>
                        </div>
                        <div
                            className={`al-toggle ${n.on ? 'al-toggle--on' : ''}`}
                            role="switch"
                            aria-checked={n.on}
                            tabIndex={0}
                            aria-label={n.label}
                            onClick={() => toggleNotification(n.id)}
                            onKeyDown={(e) => e.key === 'Enter' && toggleNotification(n.id)}
                        />
                    </div>
                ))}
                {notifSaving && <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}>Saving…</div>}
            </div>

            {/* Security */}
            <form className="card section" onSubmit={handleUpdatePassword} noValidate>
                <div className="text-card-title" style={{ marginBottom: 16 }}>Security</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="dr-new-pass">New Password</label>
                        <input
                            id="dr-new-pass"
                            type="password"
                            className="form-input"
                            placeholder="Min. 8 characters"
                            value={passForm.newPass}
                            onChange={e => { setPassForm(f => ({ ...f, newPass: e.target.value })); setPassError('') }}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="dr-confirm-pass">Confirm Password</label>
                        <input
                            id="dr-confirm-pass"
                            type="password"
                            className="form-input"
                            placeholder="Confirm new password"
                            value={passForm.confirm}
                            onChange={e => { setPassForm(f => ({ ...f, confirm: e.target.value })); setPassError('') }}
                        />
                    </div>
                </div>
                {passError && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-danger-muted, #FEE2E2)', borderRadius: 6, fontSize: 13, color: 'var(--color-danger)' }}>
                        {passError}
                    </div>
                )}
                {passStatus === 'success' && (
                    <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--color-safe-muted, #DCFCE7)', borderRadius: 6, fontSize: 13, color: 'var(--color-safe)' }}>
                        ✓ Password updated successfully.
                    </div>
                )}
                <button
                    type="submit"
                    className="btn btn-outline"
                    disabled={passStatus === 'saving'}
                    style={{ marginTop: 16 }}
                >
                    {passStatus === 'saving' ? 'Updating...' : 'Update Password'}
                </button>
            </form>

            <style>{`
        .al-toggle { width:34px; height:18px; border-radius:var(--radius-full); background:var(--color-border); position:relative; cursor:pointer; transition:background 0.2s; flex-shrink:0; }
        .al-toggle::after { content:''; position:absolute; width:13px; height:13px; border-radius:50%; background:#fff; top:2.5px; left:3px; transition:left 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.15); }
        .al-toggle--on { background:var(--color-primary); }
        .al-toggle--on::after { left:18px; }
      `}</style>
        </div>
    )
}
