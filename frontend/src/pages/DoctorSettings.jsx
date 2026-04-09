import { useState, useEffect } from 'react'
import { Stethoscope } from 'lucide-react'
import { api } from '../utils/api'
import { toast } from 'react-toastify'

export default function DoctorSettings() {
    const [saving, setSaving] = useState(false)
    const [profile, setProfile] = useState({
        fname: '',
        lname: '',
        email: '',
        phone: '',
        specialization: '',
        license: ''
    })

    const [notifications, setNotifications] = useState([
        { id: 'critical_alerts', label: 'Critical patient alerts', desc: 'SpO2, FEV1 emergency thresholds', on: true },
        { id: 'report_reminders', label: 'Report reminders', desc: 'When reports await sign-off > 24h', on: true },
        { id: 'new_assignments', label: 'New patient assignments', desc: 'When a new patient is assigned to you', on: true },
        { id: 'weekly_summary', label: 'Weekly summary', desc: 'Your panel health summary every Monday', on: false },
    ])

    const handleSaveProfile = async () => {
        setSaving(true)
        try {
            await api.auth.updateProfile({
                first_name: profile.fname,
                last_name: profile.lname,
                phone: profile.phone
            })
            
            const stored = localStorage.getItem('user_data')
            if (stored && stored !== 'undefined') {
                const parsed = JSON.parse(stored)
                parsed.first_name = profile.fname
                parsed.last_name = profile.lname
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

    const toggleNotification = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, on: !n.on } : n))
    }

    const handleUpdatePassword = () => {
        toast.info("A password reset link has been sent to your email.")
    }

    useEffect(() => {
        try {
            const stored = localStorage.getItem('user_data')
            if (stored && stored !== 'undefined') {
                const parsed = JSON.parse(stored)
                
                let fn = parsed.first_name || ''
                let ln = parsed.last_name || ''
                if (!fn && parsed.full_name) {
                    const parts = parsed.full_name.split(' ')
                    fn = parts[0] || ''
                    ln = parts.slice(1).join(' ') || ''
                } else if (!fn && parsed.user_metadata?.full_name) {
                    const parts = parsed.user_metadata.full_name.split(' ')
                    fn = parts[0] || ''
                    ln = parts.slice(1).join(' ') || ''
                }

                setProfile({
                    fname: fn,
                    lname: ln,
                    email: parsed.email || '',
                    phone: parsed.phone || '+91 00000 00000',
                    specialization: parsed.specialty || parsed.specialization || 'Doctor',
                    license: parsed.license || 'Pending'
                })
            }
        } catch(e) {
            console.error('Failed to parse user_data for doctor settings:', e)
        }
    }, [])

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
                        { id: 'dr-email', label: 'Email', value: profile.email, type: 'email', stateKey: 'email', disabled: true },
                        { id: 'dr-phone', label: 'Phone', value: profile.phone, type: 'tel', stateKey: 'phone' },
                        { id: 'dr-spec', label: 'Specialization', value: profile.specialization, type: 'text', stateKey: 'specialization', disabled: true },
                        { id: 'dr-lic', label: 'License No.', value: profile.license, type: 'text', stateKey: 'license', disabled: true },
                    ].map(f => (
                        <div key={f.id} className="form-group" style={{ margin: 0 }}>
                            <label className="form-label" htmlFor={f.id}>{f.label}</label>
                            <input id={f.id} type={f.type} className="form-input" disabled={f.disabled} defaultValue={f.value} key={`${f.id}-${f.value}`} onChange={(e) => {
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
            </div>

            {/* Security */}
            <div className="card section">
                <div className="text-card-title" style={{ marginBottom: 16 }}>Security</div>
                <div className="form-group">
                    <label className="form-label" htmlFor="dr-curr-pass">Current Password</label>
                    <input id="dr-curr-pass" type="password" className="form-input" placeholder="••••••••" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="dr-new-pass">New Password</label>
                        <input id="dr-new-pass" type="password" className="form-input" placeholder="Min. 8 characters" />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="dr-confirm-pass">Confirm Password</label>
                        <input id="dr-confirm-pass" type="password" className="form-input" placeholder="Confirm new password" />
                    </div>
                </div>
                <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={handleUpdatePassword}>Update Password</button>
            </div>



            <style>{`
        .al-toggle { width:34px; height:18px; border-radius:var(--radius-full); background:var(--color-border); position:relative; cursor:pointer; transition:background 0.2s; flex-shrink:0; }
        .al-toggle::after { content:''; position:absolute; width:13px; height:13px; border-radius:50%; background:#fff; top:2.5px; left:3px; transition:left 0.2s; box-shadow:0 1px 2px rgba(0,0,0,0.15); }
        .al-toggle--on { background:var(--color-primary); }
        .al-toggle--on::after { left:18px; }
      `}</style>
        </div>
    )
}
