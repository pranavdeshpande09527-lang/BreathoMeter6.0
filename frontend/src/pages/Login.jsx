import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Wind, Eye, EyeOff, Loader2, ShieldCheck, X } from 'lucide-react'
import { api } from '../utils/api'
import Logo from '../components/Logo'

const roles = ['Patient', 'Doctor']
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://breathometer6-0.onrender.com'

export default function Login() {
  const [role, setRole]             = useState('Patient')
  const [showPass, setShowPass]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [showForgot, setShowForgot] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotStatus, setForgotStatus] = useState(null) // null | 'sending' | 'sent' | 'error'
  const navigate = useNavigate()

  const handleForgotPassword = async e => {
    e.preventDefault()
    setForgotStatus('sending')
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      })
      setForgotStatus('sent')
    } catch {
      setForgotStatus('error')
    }
  }

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const formData = new FormData(e.target)
    const username = formData.get('username')
    const password = formData.get('password')
    try {
      const response = await api.auth.login(username, password)
      if (response?.session) {
        localStorage.setItem('supabase_token', response.session.access_token)
        localStorage.setItem('user_data', JSON.stringify(response.session.user))
        sessionStorage.setItem('supabase_token', response.session.access_token)
        sessionStorage.setItem('user_data', JSON.stringify(response.session.user))
        // Persist refresh_token so the proactive refresh timer can use it
        if (response.session.refresh_token) {
          localStorage.setItem('supabase_refresh_token', response.session.refresh_token)
          sessionStorage.setItem('supabase_refresh_token', response.session.refresh_token)
        }

        // Route by the ACTUAL role from the JWT — never trust the UI toggle for security routing
        const jwtRole = response.session.user?.user_metadata?.role?.toLowerCase()
        const destination = jwtRole === 'doctor' ? '/doctor/dashboard' : '/dashboard'
        navigate(destination)
      }
    } catch (err) {
      setError(err.message || 'Invalid username or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="al-page">
      {/* Decorative blob */}
      <div className="al-blob" aria-hidden="true" />

      <div className="al-card fade-in">
        {/* Logo */}
        <div className="al-logo">
          <Logo size={48} />
        </div>


        <h2 className="al-title">Welcome back</h2>
        <p className="al-sub">Sign in to your clinical health account</p>

        {/* Role Toggle */}
        <div className="al-roles" role="group" aria-label="Select role">
          {roles.map(r => (
            <button
              key={r}
              className={`al-role-btn${role === r ? ' al-role-btn--active' : ''}`}
              onClick={() => setRole(r)}
              type="button"
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} key={role} className="al-form">
          {error && (
            <div className="al-error" role="alert">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              placeholder="johndoe123"
              required
              autoComplete="username"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <div className="al-pass-wrap">
              <input
                id="password"
                name="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="Your password"
                required
                autoComplete="current-password"
                disabled={loading}
              />
              <button
                type="button"
                className="al-pass-toggle"
                onClick={() => setShowPass(!showPass)}
                aria-label={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="al-remember-row">
            <label className="al-check-label">
              <input type="checkbox" disabled={loading} /> Remember me
            </label>
            <button
              type="button"
              className="al-forgot"
              onClick={() => { setShowForgot(true); setForgotStatus(null); setForgotEmail('') }}
            >Forgot password?</button>
          </div>

          <button type="submit" className="btn btn-primary al-submit" disabled={loading}>
            {loading ? <Loader2 size={15} className="spin" /> : null}
            {loading ? 'Signing in...' : `Sign in as ${role}`}
          </button>
        </form>

        <div className="divider" />

        <p className="text-meta" style={{ textAlign: 'center' }}>
          Don't have an account? <Link to="/signup">Create account</Link>
        </p>
        <div style={{ textAlign: 'center', marginTop: 12 }}>
          <Link to="/" className="text-meta" style={{ color: 'var(--color-subtle)' }}>← Back to home</Link>
        </div>

        <div className="al-trust">
          <ShieldCheck size={11} color="var(--color-safe)" />
          <span>HIPAA compliant · 256-bit encrypted</span>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
        <div className="al-modal-overlay" onClick={() => setShowForgot(false)}>
          <div className="al-modal-card" onClick={e => e.stopPropagation()}>
            <button className="al-modal-close" onClick={() => setShowForgot(false)} aria-label="Close">
              <X size={16} />
            </button>
            <h3 className="al-modal-title">Reset Password</h3>
            <p className="al-modal-sub">Enter the email linked to your account and we'll send you a reset link.</p>
            {forgotStatus === 'sent' ? (
              <div className="al-modal-success">
                ✅ Reset link sent! Check your email inbox.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="al-form" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="forgot-email">Email address</label>
                  <input
                    id="forgot-email"
                    type="email"
                    className="form-input"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                {forgotStatus === 'error' && (
                  <div className="al-error">Something went wrong. Please try again.</div>
                )}
                <button
                  type="submit"
                  className="btn btn-primary al-submit"
                  disabled={forgotStatus === 'sending'}
                >
                  {forgotStatus === 'sending' ? <Loader2 size={15} className="spin" /> : null}
                  {forgotStatus === 'sending' ? 'Sending...' : 'Send Reset Link'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`
        .al-page {
          min-height: 100vh;
          background: var(--color-bg);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          position: relative;
          overflow: hidden;
        }
        .al-blob {
          position: absolute;
          width: 600px; height: 600px;
          border-radius: 50%;
          background: radial-gradient(circle, var(--color-primary-muted) 0%, transparent 70%);
          filter: blur(100px);
          top: -200px; left: -150px;
          opacity: 0.4;
          pointer-events: none;
        }
        .al-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          padding: 40px 36px;
          width: 100%;
          max-width: 420px;
        }
        .al-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 28px;
        }
        .al-logo-mark {
          width: 34px; height: 34px;
          background: linear-gradient(135deg, var(--color-primary-light) 0%, #DBEAFE 100%);
          border: 1px solid var(--color-primary-muted);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 1px 4px rgba(37,99,235,0.12);
        }
        .al-logo-name {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-text);
          letter-spacing: -0.3px;
        }
        .al-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--color-text);
          margin-bottom: 5px;
          letter-spacing: -0.4px;
        }
        .al-sub {
          font-size: 13px;
          color: var(--color-muted);
          margin-bottom: 24px;
          font-weight: 400;
        }

        /* Role toggle */
        .al-roles {
          display: flex;
          background: #F1F5F9;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 4px;
          gap: 4px;
          margin-bottom: 28px;
        }
        .al-role-btn {
          flex: 1;
          padding: 10px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          color: #64748B;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: inherit;
        }
        .al-role-btn:hover:not(.al-role-btn--active) {
          color: var(--color-primary);
        }
        .al-role-btn--active {
          background: white;
          color: var(--color-primary);
          font-weight: 700;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.02);
        }

        .al-form { display:flex; flex-direction:column; gap:2px; }

        .al-error {
          font-size: 13px;
          color: var(--color-danger);
          background: var(--color-danger-light);
          border: 1px solid var(--color-danger-muted);
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .al-pass-wrap { position: relative; }
        .al-pass-wrap .form-input { padding-right: 42px; }
        .al-pass-toggle {
          position: absolute;
          right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none;
          color: var(--color-subtle);
          cursor: pointer; padding: 2px;
          display: flex; align-items: center;
          transition: color 0.12s;
        }
        .al-pass-toggle:hover { color: var(--color-text); }

        .al-remember-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 6px 0 14px;
          font-size: 12.5px;
          color: var(--color-muted);
        }
        .al-check-label {
          display: flex;
          align-items: center;
          gap: 7px;
          cursor: pointer;
        }
        .al-forgot {
          color: var(--color-primary);
          font-size: 12.5px;
          text-decoration: none;
          font-weight: 500;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .al-forgot:hover { text-decoration: underline; }

        .al-submit {
          width: 100%;
          justify-content: center;
          padding: 11px;
          font-size: 14px;
          margin-top: 4px;
          border-radius: var(--radius-sm);
        }

        .al-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11px;
          color: var(--color-subtle);
          margin-top: 18px;
          font-weight: 500;
        }

        .al-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
          animation: fadeIn 0.18s ease;
        }
        .al-modal-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xl);
          padding: 32px 30px;
          width: 100%;
          max-width: 380px;
          animation: slideUp 0.22s cubic-bezier(.16,1,.3,1);
        }
        .al-modal-close {
          position: absolute;
          top: 14px; right: 14px;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--color-muted);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 6px;
        }
        .al-modal-close:hover { background: var(--color-hover); color: var(--color-text); }
        .al-modal-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--color-text);
          margin-bottom: 6px;
        }
        .al-modal-sub {
          font-size: 13px;
          color: var(--color-muted);
          line-height: 1.5;
        }
        .al-modal-success {
          margin-top: 16px;
          background: var(--color-safe-bg, #dcfce7);
          color: var(--color-safe, #16a34a);
          border: 1px solid var(--color-safe-border, #bbf7d0);
          border-radius: var(--radius-md);
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 500;
          text-align: center;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @keyframes spin { 100% { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  )
}
