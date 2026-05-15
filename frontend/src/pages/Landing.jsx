import { useState, useEffect, useCallback, Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Moon, Sun, Download, Smartphone, X
} from 'lucide-react'
import Logo from '../components/Logo'

const LandingAQICard = lazy(() => import('../components/LandingAQICard'))
const LandingBelowFold = lazy(() => import('../components/LandingBelowFold'))

/* ── Phase 5 SEO meta injection ────────────────────────────── */
function useSEOMeta() {
  useEffect(() => {
    // Title
    const prevTitle = document.title
    document.title = 'BreathoMeter — Real-Time Respiratory Health & AQI Monitoring'

    // Meta description
    let meta = document.querySelector('meta[name="description"]')
    const prevDesc = meta?.content || ''
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content',
      'Monitor your respiratory health and local air quality in real-time. ' +
      'BreathoMeter provides physician-audited analysis, AQI tracking, and early ' +
      'detection tools — trusted by patients managing COPD, asthma, and chronic respiratory conditions.'
    )

    // OG tags
    const setOG = (prop, content) => {
      let el = document.querySelector(`meta[property="${prop}"]`)
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.setAttribute('content', content)
    }
    setOG('og:title', 'BreathoMeter — Clinical Respiratory Health Platform')
    setOG('og:description', 'Real-time AQI monitoring, physician-reviewed assessments, and 30-day respiratory trend analysis. Free to start.')
    setOG('og:type', 'website')

    return () => {
      document.title = prevTitle
      if (meta) meta.setAttribute('content', prevDesc)
    }
  }, [])
}

export default function Landing() {
  useSEOMeta()
  const [theme, setTheme]           = useState(localStorage.getItem('theme') || 'dark')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [isInstallable, setIsInstallable]   = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [platform, setPlatform]     = useState({ isIOS: false, isAndroid: false })

  /* ── PWA install logic ────────────────────────────────────── */
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }
    const handleAppInstalled = () => {
      setIsInstallable(false)
      setDeferredPrompt(null)
    }
    const ua      = window.navigator.userAgent.toLowerCase()
    const isIOS   = /iphone|ipad|ipod/.test(ua)
    const isAndroid = /android/.test(ua)
    setPlatform({ isIOS, isAndroid })
    if (isIOS && !window.navigator.standalone) setIsInstallable(true)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (platform.isIOS) { setShowInstallModal(true); return }
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') { setIsInstallable(false); setDeferredPrompt(null) }
  }

  /* ── Theme ───────────────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    localStorage.setItem('theme', next)
    window.location.reload()
  }

  /* ── Scroll to top ───────────────────────────────────────── */
  useEffect(() => {
    window.scrollTo(0, 0)
    const raf = requestAnimationFrame(() => window.scrollTo(0, 0))
    return () => cancelAnimationFrame(raf)
  }, [])

  /* ── CTA ripple ──────────────────────────────────────────── */
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
    <div className="lp-root">
      {/* Skip navigation — WCAG 2.4.1 keyboard accessibility */}
      <a href="#main-content" className="skip-nav">Skip to main content</a>

      {/* ══ NAVBAR ══════════════════════════════════════════════ */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-logo">
            <Logo height={38} width="auto" />
          </div>
          <div className="lp-nav-links">
            <a href="#capabilities" className="lp-nav-link">Capabilities</a>
            <a href="#system"       className="lp-nav-link">System</a>
            <a href="#trust"        className="lp-nav-link">Validation</a>

            <button
              className="lp-nav-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
            </button>
            {isInstallable && (
              <button onClick={handleInstallClick} className="lp-nav-ghost-btn">
                <Download size={12} /> Install
              </button>
            )}
            <Link to="/login"  className="lp-nav-signin-link">Sign In</Link>
            <Link to="/signup" className="lp-nav-primary-btn">
              Request Access <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════ */}
      <section className="lp-hero">
        {/* Grid overlay texture */}
        <div className="lp-grid-overlay" aria-hidden />
        {/* Scanline overlay */}
        <div className="lp-scanlines" aria-hidden />
        {/* Radial vignette */}
        <div className="lp-vignette" aria-hidden />

        <div className="lp-hero-inner">

          {/* LEFT — Command content with structural framing */}
          <div className="lp-hero-left">

            {/* Layout rail — thin structural guide line only, no labels */}
            <div className="lp-left-rail" aria-hidden>
              <div className="lp-rail-line" />
            </div>


            <h1 className="lp-hero-title">
              Respiratory<br />
              monitoring<br />
              <span className="lp-hero-accent">engineered for</span><br />
              early detection.
            </h1>

            {/* Phase 5: Empathy-first sub-headline */}
            <p className="lp-hero-sub">
              Breathe easier today. Real-time alerts, physician-reviewed results,
              and 30-day trend analysis — so you stay one step ahead of your
              respiratory health.
            </p>


            {/* Phase 5: Outcome-clear CTAs */}
            <div className="lp-hero-actions">
              <Link
                to="/signup"
                className="lp-primary-cta"
                onClick={handleCtaClick}
              >
                Get My Free Respiratory Report
                <ArrowRight size={14} />
              </Link>
              <Link to="/login" className="lp-ghost-cta">
                View My Dashboard →
              </Link>
            </div>

            {/* Phase 5: Authority + empathy copy */}
            <p className="lp-hero-authority">
              Designed for patients managing COPD, asthma, and chronic respiratory
              conditions. Built alongside leading respiratory therapists.
            </p>

          </div>

          {/* RIGHT — Live Air Quality Card */}
          <div className="lp-hero-right">
            <Suspense fallback={<div className="lp-monitor-panel lp-aqi-card" style={{minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.5}}>Loading Air Quality Data…</div>}>
              <LandingAQICard />
            </Suspense>
          </div>
        </div>

        {/* Bottom rule */}
        <div className="lp-hero-rule" />
      </section>

      <Suspense fallback={<div style={{ minHeight: '100vh' }}></div>}>
        <LandingBelowFold />
      </Suspense>

      {/* ══ FOOTER ══════════════════════════════════════════════ */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <Logo height={36} width="auto" />
            <p className="lp-footer-tagline">
              Clinical respiratory intelligence.<br />
              Engineered for precision.
            </p>
          </div>

          <div className="lp-footer-contact">
            <div className="lp-footer-label">Project Owner</div>
            <span className="lp-footer-name">Pranav Deshpande</span>
            <a href="mailto:pranavdeshpande@gmail.com" className="lp-footer-email">
              pranavdeshpande@gmail.com
            </a>
          </div>

          <div className="lp-footer-links-col">
            <div className="lp-footer-label">Legal & Docs</div>
            <Link to="/privacy-policy">Privacy Policy</Link>
            <Link to="/terms-of-service">Terms of Service</Link>
            <Link to="/security">Security</Link>
            <Link to="/manual">User Manual</Link>
          </div>
        </div>

        <div className="lp-footer-bottom">
          <span>© 2026 Breathometer. All rights reserved.</span>
          <div className="lp-footer-system-row">
            <span className="lp-status-dot lp-dot-sm" />
            <span>v6.0.0 · All Systems Operational</span>
          </div>
        </div>
      </footer>

      {/* ══ iOS INSTALL MODAL ═══════════════════════════════════ */}
      {showInstallModal && (
        <div
          className="modal-overlay"
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px', animation: 'lp-fadein 0.25s ease'
          }}
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="glass-surface-deep p-6 w-full max-w-sm relative"
            style={{ borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', maxWidth: 360 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="btn btn-ghost p-1"
              style={{ position: 'absolute', top: 16, right: 16 }}
              onClick={() => setShowInstallModal(false)}
            >
              <X size={18} />
            </button>
            <div style={{ marginBottom: 24 }}>
              <div className="lp-modal-icon">
                <Smartphone size={24} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Install Breathometer</h2>
              <p style={{ fontSize: 13, opacity: 0.7 }}>Add to your home screen for direct access.</p>
            </div>
            {[
              'Tap the Share button (↑) in your browser toolbar.',
              'Scroll down and tap "Add to Home Screen".',
              'Tap "Add" to confirm.',
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
                <div className="lp-modal-step">{i + 1}</div>
                <p style={{ fontSize: 13, lineHeight: 1.5 }}>{step}</p>
              </div>
            ))}
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 24 }} onClick={() => setShowInstallModal(false)}>
              Understood
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
