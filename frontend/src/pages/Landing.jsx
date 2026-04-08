import { useState, useEffect, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Wind, Activity, Cloud, ShieldCheck, ArrowRight, CheckCircle2, MapPin, Loader2, Moon, Sun } from 'lucide-react'
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
  { value: '24/7',    label: 'Always Available' },
]

const API_BASE = 'https://breathometer6-0.onrender.com'

function getAqiColor(aqi) {
  if (aqi <= 50)  return 'var(--color-safe)'
  if (aqi <= 100) return '#F59E0B'
  if (aqi <= 150) return '#F97316'
  if (aqi <= 200) return 'var(--color-danger)'
  return '#7C3AED'
}

function getAqiLabel(aqi) {
  if (aqi <= 50)  return 'Good'
  if (aqi <= 100) return 'Moderate'
  if (aqi <= 150) return 'Unhealthy (Sensitive)'
  if (aqi <= 200) return 'Unhealthy'
  return 'Hazardous'
}

export default function Landing() {
  const [aqiData, setAqiData] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
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

  async function fetchLiveData(query) {
    setLoading(true)
    try {
      const [aqiRes, weatherRes] = await Promise.all([
        fetch(`${API_BASE}/environment/aqi?${query}`),
        fetch(`${API_BASE}/environment/weather?${query}`)
      ])
      if (aqiRes.ok)     setAqiData(await aqiRes.json())
      if (weatherRes.ok) setWeatherData(await weatherRes.json())
    } catch (e) {
      console.error('Failed to fetch live data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let interval
    function getLocationAndFetch() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            const q = `lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
            fetchLiveData(q)
            interval = setInterval(() => fetchLiveData(q), 120000)
          },
          () => {
            const q = `lat=37.7749&lon=-122.4194`
            fetchLiveData(q)
            interval = setInterval(() => fetchLiveData(q), 120000)
          },
          { timeout: 10000 }
        )
      } else {
        fetchLiveData(`lat=37.7749&lon=-122.4194`)
      }
    }
    getLocationAndFetch()
    return () => { if (interval) clearInterval(interval) }
  }, [])

  const handleSearch = e => {
    e.preventDefault()
    if (!searchQuery.trim()) return
    fetchLiveData(`location=${encodeURIComponent(searchQuery)}`)
  }

  const aqi = aqiData?.aqi ?? 0
  const aqiColor = getAqiColor(aqi)
  const aqiFraction = Math.min(aqi / 300, 1)

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


          {/* Live AQI Panel */}
          <div className="land-hero-panel stagger-2">
            <div className="land-hero-card glass-surface-deep hover-lift">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div className="panel-title">Environmental Intelligence</div>
                <div className="land-live-badge glow-danger">
                  <span className="land-live-dot" />
                  LIVE
                </div>
              </div>

              <form onSubmit={handleSearch} className="land-search-form">
                <div className="land-search-input-wrapper">
                  <MapPin size={14} className="search-icon" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Enter city (e.g. Mumbai)"
                    className="land-search-input"
                  />
                </div>
                <button type="submit" className="btn btn-primary btn-sm glow-primary">
                  Search
                </button>
              </form>

              {loading ? (
                <div className="land-aqi-loading">
                  <div className="loading-spinner-outer">
                    <Loader2 size={32} className="spin" color="var(--color-primary)" />
                  </div>
                  <span className="loading-text">Getting air quality data...</span>
                </div>
              ) : aqiData ? (
                <div className="fade-in-fast" style={{ width: '100%' }}>
                  <div className="land-aqi-visual-wrap">
                    <div className="aqi-ring-container" style={{ '--aqi-glow': `${aqiColor}22` }}>
                      <svg width="160" height="160" viewBox="0 0 160 160" style={{ position: 'relative', zIndex: 1 }}>
                        <circle cx="80" cy="80" r="68" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="10" />
                        <circle
                          cx="80" cy="80" r="68" fill="none"
                          stroke={aqiColor} strokeWidth="10"
                          strokeDasharray={`${2 * Math.PI * 68 * aqiFraction} ${2 * Math.PI * 68 * (1 - aqiFraction)}`}
                          strokeLinecap="round"
                          className="aqi-ring-progress"
                          style={{
                            stroke: aqiColor,
                            filter: `drop-shadow(0 0 8px ${aqiColor}80)`,
                          }}
                        />
                      </svg>
                      <div className="aqi-content">
                        <span className="aqi-value">{aqi}</span>
                        <span className="aqi-label">AQI</span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div className="aqi-status-pill" style={{ backgroundColor: `${aqiColor}15`, color: aqiColor, borderColor: `${aqiColor}30` }}>
                      {getAqiLabel(aqi)}
                    </div>
                  </div>

                  <div className="land-mini-metrics">
                    {[
                      { label: 'PM2.5', value: aqiData.pm25, isPrimary: aqiData.pm25 === aqi },
                      { label: 'PM10',  value: aqiData.pm10, isPrimary: aqiData.pm10 === aqi },
                      { label: 'Temp',  value: weatherData ? `${Math.round(weatherData.temperature)}°` : '—' }
                    ].map(m => (
                      <div key={m.label} className={`land-mini-metric ${m.isPrimary ? 'is-active glow-primary' : ''}`}>
                        <span className="m-label">{m.label}</span>
                        <span className="m-value">{typeof m.value === 'number' ? Math.round(m.value) : m.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="land-card-footer">
                    <MapPin size={12} color="var(--color-primary)" />
                    <span>{aqiData.location_name?.split(',')[0] || 'Current Location'}</span>
                    <div className="footer-dot" />
                    <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ) : (
                <div className="land-aqi-error">Data source unavailable.</div>
              )}
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
            <a href="#">Security</a>
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
