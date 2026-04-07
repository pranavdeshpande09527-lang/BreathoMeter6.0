import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wind, Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '../utils/api'
import Logo from '../components/Logo'

const roles = ['Patient', 'Doctor']

export default function Signup() {
  const [role, setRole] = useState('Patient')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const formData = new FormData(e.target)
    const username = formData.get('username')
    const password = formData.get('password')
    const firstName = formData.get('fname')
    const lastName = formData.get('lname')
    const fullName = `${firstName} ${lastName}`.trim()
    const dob = formData.get('dob')
    
    // Construct base payload
    let payload = {
      username,
      password,
      full_name: fullName,
      role: role.toLowerCase(),
      date_of_birth: dob
    }

    // Add profile-specific data
    if (role === 'Patient') {
      const pData = {
        gender: formData.get('gender')
      }
      Object.assign(payload, pData)
    } else {
      const dData = {
        specialty: formData.get('specialty'),
        experience: formData.get('experience'),
        medical_license: formData.get('medical_license')
      }
      Object.assign(payload, dData)
    }

    try {
      // Use the standardized api utility for consistent authentication and error handling
      const response = await api.auth.signup(
        username,
        password,
        fullName,
        role.toLowerCase(),
        payload // This already contains the role-specific fields merged in earlier
      )

      if (response && response.session) {
        localStorage.setItem('supabase_token', response.session.access_token)
        localStorage.setItem('user_data', JSON.stringify(response.session.user))
        sessionStorage.setItem('supabase_token', response.session.access_token)
        sessionStorage.setItem('user_data', JSON.stringify(response.session.user))
        navigate(role === 'Doctor' ? '/doctor/dashboard' : '/profile-setup')
      } else if (response && (response.user || response.message)) {
        setSuccess('Account created successfully! Redirecting to login...')
        setTimeout(() => navigate('/login'), 2000)
      }
    } catch (err) {
      console.error("Signup error:", err)
      setError(err.message || 'Failed to create account. Please check your details.')
      setCooldown(10)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <div className="auth-logo">
          <Logo size={48} />
        </div>

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub text-meta">Start monitoring your respiratory health today</p>

        <div className="auth-roles">
          {roles.map(r => (
            <button key={r} className={`auth-role-btn ${role === r ? 'auth-role-btn--active' : ''}`}
              onClick={() => setRole(r)} type="button">{r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} key={role}>
          {error && <div className="auth-error" style={{ color: 'var(--color-danger)', background: 'var(--color-danger-light)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #FECDD3' }}>{error}</div>}
          {success && <div className="auth-success" style={{ color: 'var(--color-safe)', background: 'var(--color-safe-light)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px', border: '1px solid #BBF7D0' }}>{success}</div>}
          <div className="auth-name-row">
            <div className="form-group">
              <label className="form-label" htmlFor="fname">First name</label>
              <input id="fname" name="fname" type="text" className="form-input" placeholder="Sarah" required disabled={loading} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="lname">Last name</label>
              <input id="lname" name="lname" type="text" className="form-input" placeholder="Chen" required disabled={loading} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="su-username">Username</label>
            <input id="su-username" name="username" type="text" className="form-input" placeholder="johndoe123" required autoComplete="username" disabled={loading} />
          </div>

          {role === 'Doctor' && (
            <div className="doctor-profile-fields" style={{ background: 'var(--color-bg)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-primary)' }}>Specialization Details</h3>
              <div className="form-group">
                <label className="form-label" htmlFor="specialty">Specialization</label>
                <select id="specialty" name="specialty" className="form-input" required>
                  <option value="">Select...</option>
                  <option value="Pulmonologist">Pulmonologist</option>
                  <option value="Oncologist">Oncologist</option>
                  <option value="Infectious Disease Specialist">Infectious Disease Specialist</option>
                  <option value="ENT Specialist">ENT Specialist</option>
                  <option value="Cardiologist">Cardiologist</option>
                  <option value="General Physician">General Physician</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="experience">Experience</label>
                <input id="experience" name="experience" type="text" className="form-input" placeholder="e.g. 10+ years" required />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="license">Medical License No.</label>
                <input id="license" name="medical_license" type="text" className="form-input" placeholder="MCI-2024-XXXXX" required />
              </div>
            </div>
          )}

          <div className="auth-name-row">
            <div className="form-group">
              <label className="form-label" htmlFor="dob">Date of Birth</label>
              <input id="dob" name="dob" type="date" className="form-input" required disabled={loading} />
            </div>
            {role === 'Patient' && (
              <div className="form-group">
                <label className="form-label" htmlFor="gender">Gender</label>
                <select id="gender" name="gender" className="form-input" required disabled={loading}>
                  <option value="">Select...</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="su-pass">Password</label>
            <div className="auth-pass-wrap">
              <input id="su-pass" name="password" type={showPass ? 'text' : 'password'} className="form-input"
                placeholder="Min. 8 characters" required minLength={8} autoComplete="new-password" disabled={loading} />
              <button type="button" className="auth-pass-toggle" onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="auth-terms text-meta">
            By creating an account you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading || cooldown > 0} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {loading ? <Loader2 size={16} className="spin" /> : null}
            {loading ? 'Creating...' : cooldown > 0 ? `Wait ${cooldown}s` : `Create ${role} Account`}
          </button>
        </form>

        <div className="divider" />
        <p className="text-meta" style={{ textAlign: 'center' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <div style={{ textAlign: 'center', marginTop: 14 }}>
          <Link to="/" className="text-meta" style={{ color: 'var(--color-subtle)' }}>← Back to home</Link>
        </div>
      </div>

      <style>{`
        .auth-page { min-height:100vh; background:var(--color-bg); display:flex; align-items:center; justify-content:center; padding:32px 16px; position:relative; overflow:hidden; }
        .auth-page::before { content:''; position:absolute; width:100%; height:100%; background: radial-gradient(circle at 10% 20%, rgba(37,99,235,0.03) 0%, transparent 40%), radial-gradient(circle at 90% 80%, rgba(37,99,235,0.03) 0%, transparent 40%); pointer-events:none; }
        .auth-card { width:100%; max-width:440px; padding:40px 36px; z-index:2; border-radius:32px; }
        .auth-logo { display:flex; align-items:center; gap:10px; margin-bottom:32px; }
        .auth-logo-mark { width:36px; height:36px; background:linear-gradient(135deg, #2563EB, #60A5FA); border-radius:12px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(37,99,235,0.2); }
        .auth-logo-mark svg { color:white !important; }
        .auth-logo-name { font-size:16px; font-weight:800; color:var(--color-text); letter-spacing:-0.5px; }
        .auth-title { font-size:24px; font-weight:850; color:var(--color-text); margin-bottom:8px; letter-spacing:-1px; }
        .auth-sub { margin-bottom:28px; line-height:1.6; }
        .auth-roles { display:flex; background:#F1F5F9; border:1px solid #E2E8F0; border-radius:16px; padding:4px; gap:4px; margin-bottom:24px; }
        .auth-role-btn { flex:1; padding:10px; border-radius:12px; font-size:14px; font-weight:600; color:#64748B; background:transparent; border:none; cursor:pointer; transition:all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .auth-role-btn:hover { color:var(--color-primary); }
        .auth-role-btn--active { background:white; color:var(--color-primary); box-shadow:0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02); }
        .auth-name-row { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .auth-pass-wrap { position:relative; }
        .auth-pass-wrap .form-input { padding-right:44px; }
        .auth-pass-toggle { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; color:#94A3B8; cursor:pointer; padding:6px; display:flex; align-items:center; transition:color 0.2s; }
        .auth-pass-toggle:hover { color:var(--color-primary); }
        .auth-terms { margin:16px 0 24px; line-height:1.6; font-size:12px; color:#94A3B8; }
        .auth-terms a { color:#64748B; text-decoration:underline; font-weight:600; }
        .auth-submit { width:100%; justify-content:center; padding:14px; font-size:15px; font-weight:700; border-radius:16px; box-shadow:0 4px 12px rgba(37,99,235,0.15); transition:all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .auth-submit:not(:disabled):hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(37,99,235,0.25); }
        .auth-submit:not(:disabled):active { transform:translateY(0); }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
