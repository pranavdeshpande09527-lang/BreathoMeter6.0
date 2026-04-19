import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wind, Activity, Cloud, ShieldCheck, ArrowRight, CheckCircle2, Moon, Sun } from 'lucide-react'
import Logo from '../components/Logo'
import { playThemeTransition } from '../utils/themeTransition'

const features = [
  {
    icon: Wind,
    title: 'Breath Check',
    desc: 'Record and check how well you breathe. Get easy-to-read results in seconds.',
    color: 'var(--color-primary)',
    bg: 'var(--color-primary-light)',
    border: 'var(--color-primary-muted)',
  },
  {
    icon: Activity,
    title: 'Health Risk Alert',
    desc: 'Find out if you might have a breathing problem — early, before it gets worse.',
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-light)',
    border: 'var(--color-danger-muted)',
  },
  {
    icon: Cloud,
    title: 'Air Quality Check',
    desc: 'See how clean the air is in your area and how it may affect your breathing.',
    color: '#0891B2',
    bg: '#E0F2FE',
    border: '#BAE6FD',
  },
  {
    icon: ShieldCheck,
    title: 'Talk to a Doctor',
    desc: 'Your results are checked by real, certified doctors — not just a computer.',
    color: 'var(--color-safe)',
    bg: 'var(--color-safe-light)',
    border: 'var(--color-safe-muted)',
  },
]

const stats = [
  { value: '24/7',      label: 'Always Available' },
  { value: 'Smart',     label: 'AI Health Assessment' },
  { value: 'Real-time', label: 'Air Quality Tracking' },
  { value: 'Secure',    label: 'Private Medical Data' },
]

const API_BASE = 'https://breathometer6-0.onrender.com'

export default function Landing() {
  const canvasRef = useRef(null)
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = (e) => {
    const next = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', next)
    window.location.reload()
  }

  // ── Always start at top (beats browser scroll-restoration timing) ──
  useEffect(() => {
    window.scrollTo(0, 0)
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  // ── Particle system ────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId
    let W, H

    const PARTICLES = []
    const COUNT = 55

    function resize() {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }

    function spawn() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.6 + 0.4,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18 - 0.05,
        a: Math.random() * 0.35 + 0.08,
        da: (Math.random() * 0.003 + 0.001) * (Math.random() > 0.5 ? 1 : -1),
        aMin: 0.06,
        aMax: 0.42,
      }
    }

    resize()
    for (let i = 0; i < COUNT; i++) PARTICLES.push(spawn())
    window.addEventListener('resize', resize)

    function draw() {
      ctx.clearRect(0, 0, W, H)
      for (const p of PARTICLES) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(99, 130, 235, ${p.a})`
        ctx.fill()
        p.x += p.vx
        p.y += p.vy
        p.a += p.da
        if (p.a >= p.aMax || p.a <= p.aMin) p.da *= -1
        if (p.x < -10) p.x = W + 10
        if (p.x > W + 10) p.x = -10
        if (p.y < -10) p.y = H + 10
        if (p.y > H + 10) p.y = -10
      }
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // ── CTA ripple ────────────────────────────────────────────
  const handleCtaClick = useCallback((e) => {
    const btn = e.currentTarget
    const rect = btn.getBoundingClientRect()
    const ripple = document.createElement('span')
    ripple.className = 'cta-ripple-el'
    ripple.style.left = `${e.clientX - rect.left}px`
    ripple.style.top  = `${e.clientY - rect.top}px`
    btn.appendChild(ripple)
    setTimeout(() => ripple.remove(), 620)
  }, [])

  return (
    <div className="land">
      {/* Navbar */}
      <nav className="land-nav glass-surface">
        <div className="land-nav-inner">
          <div className="land-logo">
            <Logo height={44} width="auto" />
          </div>
          <div className="land-nav-links">
            <button 
              className="btn btn-ghost btn-sm"
              onClick={(e) => toggleTheme(e)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', borderRadius: '50%', padding: 0, transition: 'transform 0.2s, box-shadow 0.2s' }}
              aria-label="Toggle theme"
              title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.15)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              {theme === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <div className="nav-divider" />
            <a href="#features" className="land-nav-link">Features</a>
            <a href="#stats"    className="land-nav-link">Platform</a>
            <div className="nav-divider" />
            <Link to="/login"  className="btn btn-ghost btn-sm">Login</Link>
            <Link to="/signup" className="btn btn-primary btn-sm glow-primary">
              Get Started <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </nav>


      {/* Hero */}
      <section className="land-hero bg-mesh-animated">
        {/* Floating particles */}
        <canvas ref={canvasRef} className="hero-particle-canvas" aria-hidden />
        {/* Air-flow wave overlay */}
        <div className="hero-airflow" aria-hidden />

        <div className="land-hero-inner">
          <div className="land-hero-content">
            <div className="land-hero-badge stagger-1">
              <div className="pulse-dot-safe" />
              <span>Trusted by Doctors &amp; Patients</span>
            </div>

            <h1 className="land-hero-title stagger-1">
              Respiratory Health,<br />
              Defined by{' '}
              <span className="hero-gradient-word">Intelligence.</span>
            </h1>

            <p className="land-hero-sub stagger-2">
              Check your breathing health, track the air around you, and get guidance from real doctors — all in one simple app.
            </p>

            <div className="land-hero-actions stagger-3">
              <Link
                to="/signup"
                className="btn btn-primary land-hero-cta-btn glow-primary"
                onClick={handleCtaClick}
              >
                Get Started <ArrowRight size={16} />
              </Link>
              <Link to="/login" className="btn glass-surface-btn hover-lift">
                Sign In
              </Link>
            </div>

            <div className="land-hero-trust stagger-4">
              {[
                { text: 'Your Data is Safe', icon: ShieldCheck },
                { text: 'Smart Health Checks', icon: Activity },
                { text: 'Doctor Approved', icon: CheckCircle2 }
              ].map((item, idx) => (
                <div key={idx} className="land-trust-item">
                  <item.icon size={13} color="var(--color-primary)" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
    </section>

      {/* Stats Bar */}
      <section className="land-stats" id="stats">
        <div className="land-stats-inner">
          {stats.map((s, i) => (
            <div key={s.label} className={`land-stat fade-in stagger-${i + 1}`}>
              <div className="land-stat-value">{s.value}</div>
              <div className="land-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="land-features" id="features">
        <div className="land-section-inner">
          <div className="land-section-header">
            <span className="section-tag stagger-1">What We Offer</span>
            <h2 className="land-section-title stagger-1">Everything You Need for Breathing Health</h2>
            <p className="land-section-sub stagger-2">
              Simple tools to help you understand and take care of your breathing — at home or with your doctor.
            </p>
          </div>
          <div className="land-features-grid">
            {features.map((f, i) => (
              <div key={f.title} className={`land-feature-card hover-lift stagger-${(i % 4) + 1}`}>
                <div className="feature-card-glass" />
                <div className="land-feature-icon" style={{ background: f.bg, border: `1px solid ${f.border}` }}>
                  <f.icon size={22} color={f.color} strokeWidth={2} />
                </div>
                <h3 className="land-feature-title">{f.title}</h3>
                <p className="land-feature-desc">{f.desc}</p>
                <div className="feature-glow" style={{ background: `radial-gradient(circle at center, ${f.color}15 0%, transparent 70%)` }} />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="land-cta">
        <div className="land-cta-content glass-surface-deep hover-lift stagger-1">
          <div className="cta-sparkle" />
          <h2 className="land-cta-title">Upgrade Your Clinical Standard</h2>
          <p className="land-cta-sub">
            Join thousands of people and doctors who use Breathometer to stay on top of their breathing health.
          </p>
          <div className="land-cta-actions">
            <Link to="/signup" className="btn btn-primary btn-lg glow-primary">
              Get Started Now <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn btn-ghost">Already have an account? Sign In</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="land-footer">
        <div className="footer-top">
          <div className="land-logo">
            <Logo size={40} />
          </div>
          <div className="footer-contact" style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', color: 'var(--text-muted)' }}>
            <span style={{ fontWeight: '500', color: 'var(--text-main)' }}>Project Owner</span>
            <span>pranav deshpande</span>
            <a href="mailto:pranavdeshpande09527@gmail.com" style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>pranavdeshpande09527@gmail.com</a>
          </div>
          <div className="footer-links">
            <Link to="/privacy-policy">Privacy</Link>
            <Link to="/terms-of-service">Terms</Link>
            <Link to="/security">Security</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span className="text-meta">© 2026 Breathometer. All rights reserved.</span>
          <span className="text-meta">v5.2.0 • Safe &amp; Secure</span>
        </div>
      </footer>

    </div>
  )
}
