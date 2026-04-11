import { useState, useEffect } from 'react'
import { User, Bell, Shield, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { api } from '../utils/api'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

export default function Settings() {
    // ── Profile form state (loaded from localStorage + backend) ──────────
    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        contact_email: '',   // User's real Gmail for email notifications
        phone: '',
        date_of_birth: '',
        blood_group: '',
        known_conditions: '',
        age: '',
        gender: '',
        height: '',
        weight: '',
        smoking_status: '',
        activity_level: '',
        aqi_threshold: 100,
    })

    const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | success | error
    const [saveError, setSaveError] = useState('')

    // Password form state
    const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' })
    const [passStatus, setPassStatus] = useState('idle')
    const [passError, setPassError] = useState('')

    // Notifications state
    const [notifications, setNotifications] = useState({
        'Health alerts': true,
        'AQI warnings': true,
        'Analysis complete': true,
        'Medication reminders': false,
        'Doctor messages': true,
    })
    const [notifLoaded, setNotifLoaded] = useState(false)
    const [notifSaving, setNotifSaving] = useState(false)

    // Load profile from localStorage on mount, then try to fetch latest from backend
    useEffect(() => {
        let userData = {}
        try {
            const stored = localStorage.getItem('user_data')
            if (stored && stored !== 'undefined') {
                userData = JSON.parse(stored) || {}
            }
        } catch (e) {
            console.error('Failed to parse user_data:', e)
        }

        // Pre-fill from stored JWT user data
        const fullParts = (userData.full_name || userData.user_metadata?.full_name || '').split(' ')
        setForm(prev => ({
            ...prev,
            first_name: userData.first_name || fullParts[0] || '',
            last_name: userData.last_name || fullParts.slice(1).join(' ') || '',
            contact_email: userData.contact_email || '',
            phone: userData.phone || '',
            date_of_birth: userData.date_of_birth || '',
            blood_group: userData.blood_group || '',
            known_conditions: userData.known_conditions || '',
            aqi_threshold: userData.aqi_threshold ?? 100,
        }))

        // Also try to load the latest saved profile from the backend health_profiles table
        // (uses GET /health/latest to avoid a new dedicated endpoint)
        api.auth.getProfile().then(res => {
            if (res?.user) {
                const u = res.user
                const p = u.profile || {}
                const parts = (u.full_name || '').split(' ')
                setForm(prev => ({
                    ...prev,
                    first_name: p.first_name || parts[0] || '',
                    last_name: p.last_name || parts.slice(1).join(' ') || '',
                    contact_email: p.contact_email || prev.contact_email,
                    phone: p.phone || prev.phone,
                    date_of_birth: p.date_of_birth || prev.date_of_birth,
                    blood_group: p.blood_group || prev.blood_group,
                    known_conditions: p.known_conditions || prev.known_conditions,
                    age: p.age || '',
                    gender: p.gender || '',
                    height: p.height || '',
                    weight: p.weight || '',
                    smoking_status: p.smoking_status || '',
                    activity_level: p.activity_level || '',
                    aqi_threshold: p.aqi_threshold ?? prev.aqi_threshold,
                }))
            }
        }).catch(() => { /* non-critical */ })

        // Load notification preferences from backend
        api.auth.getNotifications().then(res => {
            if (res?.preferences && Object.keys(res.preferences).length > 0) {
                setNotifications(prev => ({ ...prev, ...res.preferences }))
            }
            setNotifLoaded(true)
        }).catch(() => { setNotifLoaded(true) })
    }, [])

    function handleField(e) {
        setForm(f => ({ ...f, [e.target.name]: e.target.value }))
        setSaveStatus('idle')
    }

    async function handleSaveProfile(e) {
        e.preventDefault()
        setSaveStatus('saving')
        setSaveError('')
        try {
            await api.auth.updateProfile({
                first_name: form.first_name.trim() || null,
                last_name: form.last_name.trim() || null,
                contact_email: form.contact_email.trim() || null,
                phone: form.phone.trim() || null,
                date_of_birth: form.date_of_birth || null,
                blood_group: form.blood_group || null,
                known_conditions: form.known_conditions.trim() || null,
                age: form.age ? parseInt(form.age) : null,
                gender: form.gender || null,
                height: form.height ? parseFloat(form.height) : null,
                weight: form.weight ? parseFloat(form.weight) : null,
                smoking_status: form.smoking_status || null,
                activity_level: form.activity_level || null,
                aqi_threshold: form.aqi_threshold ? parseInt(form.aqi_threshold) : 100,
            })

            // Update localStorage so dashboard etc. see the new name
            let stored = {}
            try {
                const lsData = localStorage.getItem('user_data')
                if (lsData && lsData !== 'undefined') {
                    stored = JSON.parse(lsData) || {}
                }
            } catch (e) {
                console.error('Failed to parse user_data during save:', e)
            }

            localStorage.setItem('user_data', JSON.stringify({
                ...stored,
                first_name: form.first_name,
                last_name: form.last_name,
                contact_email: form.contact_email,
                phone: form.phone,
                date_of_birth: form.date_of_birth,
                blood_group: form.blood_group,
                known_conditions: form.known_conditions,
                aqi_threshold: form.aqi_threshold,
            }))

            setSaveStatus('success')
            setTimeout(() => setSaveStatus('idle'), 3000)
        } catch (err) {
            setSaveStatus('error')
            setSaveError(err.message || 'Failed to save profile. Please try again.')
        }
    }

    async function handleUpdatePassword(e) {
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
            setPassForm({ current: '', newPass: '', confirm: '' })
            setTimeout(() => setPassStatus('idle'), 3000)
        } catch (err) {
            setPassStatus('error')
            setPassError(err.message || 'Failed to update password. Please try again.')
        }
    }

    async function handleToggleNotification(label) {
        const updated = { ...notifications, [label]: !notifications[label] }
        setNotifications(updated)
        if (!notifLoaded) return
        setNotifSaving(true)
        try {
            await api.auth.updateNotifications(updated)
        } catch (e) {
            // Revert on failure
            setNotifications(notifications)
        } finally {
            setNotifSaving(false)
        }
    }

    const saveBtnLabel = saveStatus === 'saving'
        ? 'Saving...'
        : saveStatus === 'success'
            ? '✓ Saved!'
            : 'Save Profile'

    return (
        <div className="page-enter">
            <div className="page-header">
                <h1 className="text-page-title">Settings</h1>
            </div>

            {/* ── Health Profile ─────────────────────────────────────── */}
            <form className="card section" onSubmit={handleSaveProfile} noValidate>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                    <User size={16} color="var(--color-primary)" />
                    <div className="text-card-title">Health Profile</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 24px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-fname">First Name</label>
                        <input
                            id="s-fname"
                            name="first_name"
                            type="text"
                            className="form-input"
                            value={form.first_name}
                            onChange={handleField}
                            placeholder="First name"
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-lname">Last Name</label>
                        <input
                            id="s-lname"
                            name="last_name"
                            type="text"
                            className="form-input"
                            value={form.last_name}
                            onChange={handleField}
                            placeholder="Last name"
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-contact-email">
                            Notification Email (Gmail)
                        </label>
                        <input
                            id="s-contact-email"
                            name="contact_email"
                            type="email"
                            className="form-input"
                            value={form.contact_email}
                            onChange={handleField}
                            placeholder="your@gmail.com"
                            autoComplete="email"
                        />
                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
                            Health reports &amp; AQI warnings will be sent here.
                        </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-phone">Phone</label>
                        <input
                            id="s-phone"
                            name="phone"
                            type="tel"
                            className="form-input"
                            value={form.phone}
                            onChange={handleField}
                            placeholder="+91 ..."
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-dob">Date of Birth</label>
                        <input
                            id="s-dob"
                            name="date_of_birth"
                            type="date"
                            className="form-input"
                            value={form.date_of_birth}
                            onChange={handleField}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-blood">Blood Group</label>
                        <select
                            id="s-blood"
                            name="blood_group"
                            className="form-input"
                            value={form.blood_group}
                            onChange={handleField}
                        >
                            <option value="">Select...</option>
                            {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-gender">Gender</label>
                        <select
                            id="s-gender"
                            name="gender"
                            className="form-input"
                            value={form.gender}
                            onChange={handleField}
                        >
                            <option value="">Select...</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-age">Age</label>
                        <input
                            id="s-age"
                            name="age"
                            type="number"
                            className="form-input"
                            value={form.age}
                            onChange={handleField}
                            placeholder="Years"
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-height">Height (cm)</label>
                        <input
                            id="s-height"
                            name="height"
                            type="number"
                            className="form-input"
                            value={form.height}
                            onChange={handleField}
                            placeholder="cm"
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-weight">Weight (kg)</label>
                        <input
                            id="s-weight"
                            name="weight"
                            type="number"
                            className="form-input"
                            value={form.weight}
                            onChange={handleField}
                            placeholder="kg"
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-smoking">Smoking Status</label>
                        <select
                            id="s-smoking"
                            name="smoking_status"
                            className="form-input"
                            value={form.smoking_status}
                            onChange={handleField}
                        >
                            <option value="">Select...</option>
                            <option value="Never">Never Smoked</option>
                            <option value="Former">Former Smoker</option>
                            <option value="Current">Current Smoker</option>
                        </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-activity">Activity Level</label>
                        <select
                            id="s-activity"
                            name="activity_level"
                            className="form-input"
                            value={form.activity_level}
                            onChange={handleField}
                        >
                            <option value="">Select...</option>
                            <option value="Low">Low (Sedentary)</option>
                            <option value="Moderate">Moderate (Active)</option>
                            <option value="High">High (Very Active)</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', marginTop: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="s-aqi-threshold">AQI Alert Threshold</label>
                        <input
                            id="s-aqi-threshold"
                            name="aqi_threshold"
                            type="number"
                            min="0"
                            max="500"
                            className="form-input"
                            value={form.aqi_threshold}
                            onChange={handleField}
                            placeholder="100"
                        />
                        <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 4 }}>
                            Alerts trigger when AQI exceeds this value
                        </div>
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: 16, marginBottom: 0 }}>
                    <label className="form-label" htmlFor="s-conditions">Known Conditions</label>
                    <input
                        id="s-conditions"
                        name="known_conditions"
                        type="text"
                        className="form-input"
                        value={form.known_conditions}
                        onChange={handleField}
                        placeholder="e.g. Seasonal rhinitis, mild asthma"
                    />
                </div>

                {/* Save feedback */}
                {saveStatus === 'error' && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-danger-muted, #FEE2E2)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <AlertCircle size={14} color="var(--color-danger)" />
                        <span style={{ color: 'var(--color-danger)' }}>{saveError}</span>
                    </div>
                )}
                {saveStatus === 'success' && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--color-safe-muted, #DCFCE7)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                        <CheckCircle2 size={14} color="var(--color-safe)" />
                        <span style={{ color: 'var(--color-safe)' }}>Profile saved successfully.</span>
                    </div>
                )}

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saveStatus === 'saving'}
                    style={{ marginTop: 20, minWidth: 120 }}
                >
                    {saveStatus === 'saving' && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                    {saveBtnLabel}
                </button>
            </form>

            {/* ── Notifications ─────────────────────────────────────── */}
            <div className="card section">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Bell size={16} color="var(--color-primary)" />
                    <div className="text-card-title">Notifications</div>
                </div>
                {[
                    { label: 'Health alerts', desc: 'Critical SpO2 and breath quality alerts' },
                    { label: 'AQI warnings', desc: 'When air quality affects your area' },
                    { label: 'Analysis complete', desc: 'When your breath analysis is ready' },
                    { label: 'Medication reminders', desc: 'Scheduled medication and check reminders' },
                    { label: 'Doctor messages', desc: 'Messages from your assigned specialist' },
                ].map(n => (
                    <div key={n.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid var(--color-border)' }}>
                        <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{n.label}</div>
                            <div className="text-meta">{n.desc}</div>
                        </div>
                        <div 
                            className={`s-toggle ${notifications[n.label] ? 's-toggle--on' : ''}`} 
                            role="switch" 
                            aria-checked={notifications[n.label]} 
                            tabIndex={0} 
                            aria-label={n.label}
                            onClick={() => handleToggleNotification(n.label)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleToggleNotification(n.label); } }}
                        />
                    </div>
                ))}
                {notifSaving && <div style={{ fontSize: 11, color: 'var(--color-muted)', marginTop: 8 }}>Saving…</div>}
            </div>

            {/* ── Security / Password ───────────────────────────────── */}
            <form className="card section" onSubmit={handleUpdatePassword} noValidate>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Shield size={16} color="var(--color-primary)" />
                    <div className="text-card-title">Security</div>
                </div>
                <div className="form-group">
                    <label className="form-label" htmlFor="curr-pass">Current Password</label>
                    <input
                        id="curr-pass"
                        type="password"
                        className="form-input"
                        placeholder="••••••••"
                        value={passForm.current}
                        onChange={e => setPassForm(f => ({ ...f, current: e.target.value }))}
                    />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="new-pass">New Password</label>
                        <input
                            id="new-pass"
                            type="password"
                            className="form-input"
                            placeholder="Min. 8 characters"
                            value={passForm.newPass}
                            onChange={e => { setPassForm(f => ({ ...f, newPass: e.target.value })); setPassError('') }}
                        />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="confirm-pass">Confirm Password</label>
                        <input
                            id="confirm-pass"
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
                        ✓ Password updated.
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

            {/* ── Danger Zone ───────────────────────────────────────── */}
            <div className="card" style={{ borderColor: 'var(--color-danger-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <Trash2 size={16} color="var(--color-danger)" />
                    <div className="text-card-title" style={{ color: 'var(--color-danger)' }}>Danger Zone</div>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button
                        className="btn btn-outline"
                        style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                        onClick={() => api.auth.logout()}
                    >
                        Logout all devices
                    </button>
                    <button className="btn btn-danger" onClick={() => window.confirm('Are you sure you want to delete your account? This cannot be undone.') && api.auth.logout()}>
                        Delete account
                    </button>
                </div>
            </div>

            <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .s-toggle { width:34px; height:18px; border-radius:var(--radius-full); background:var(--color-border); position:relative; cursor:pointer; transition:background 0.2s; flex-shrink:0; }
        .s-toggle::after { content:''; position:absolute; width:13px; height:13px; border-radius:50%; background:#fff; top:2.5px; left:3px; transition:left 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.15); }
        .s-toggle--on { background:var(--color-primary); }
        .s-toggle--on::after { left:18px; }
      `}</style>
        </div>
    )
}
