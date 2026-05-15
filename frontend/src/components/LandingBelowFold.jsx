import { useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Wind, Activity, Cloud, ShieldCheck, ArrowRight, CheckCircle2
} from 'lucide-react'

/* ── Feature modules ────────────────────────────────────────────── */
const modules = [
  {
    icon: Wind,
    title: 'Breath Analysis Engine',
    desc: 'Track your breathing patterns right from home. The engine flags deviations early — giving you time to act, not react.',
    accent: 'var(--color-primary)',
  },
  {
    icon: Activity,
    title: 'Risk Assessment',
    desc: 'Understand your respiratory risk profile in minutes. Evidence-based assessment built for both patients and clinicians.',
    accent: 'var(--color-danger)',
  },
  {
    icon: Cloud,
    title: 'Environmental Intelligence',
    desc: "Know what's in your air before you step outside. Real-time AQI data mapped to your location, every day.",
    accent: '#0891B2',
  },
  {
    icon: ShieldCheck,
    title: 'Clinical Review Layer',
    desc: 'Your assessment data is structured for easy review during your next clinical visit — designed to complement your care team.',
    accent: 'var(--color-safe)',
  },
]

export default function LandingBelowFold() {
  /* ── Scroll-reveal ───────────────────────────────────────────── */
  useEffect(() => {
    const els = document.querySelectorAll('.reveal-on-scroll')
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            obs.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )
    els.forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  /* ── CTA ripple ──────────────────────────────────────────────── */
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
    <main id="main-content">

      {/* ══ CAPABILITIES SECTION ══════════════════════════════════ */}
      <section className="lp-capabilities" id="capabilities">
        <div className="lp-section-inner">
          <div className="lp-cap-header reveal-on-scroll">
            <div className="lp-section-tag">WHAT WE OFFER</div>
            <h2 className="lp-section-title lp-title-center">
              A comprehensive respiratory<br />analysis ecosystem.
            </h2>
            <p className="lp-section-sub lp-title-center" style={{ margin: '12px auto 0', maxWidth: 560 }}>
              Unified modules designed to support monitoring, assessment, and informed care decisions.
            </p>
          </div>

          <div className="lp-modules-grid">
            {modules.map((mod, i) => (
              <div
                key={mod.title}
                className="lp-module-card reveal-on-scroll"
                style={{ '--delay': `${i * 0.07}s`, '--accent': mod.accent }}
              >
                <div className="lp-module-icon">
                  <mod.icon size={18} />
                </div>
                <h3 className="lp-module-title">{mod.title}</h3>
                <p className="lp-module-desc">{mod.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRECISION CTA ════════════════════════════════════════ */}
      <section className="lp-cta-section">
        <div className="lp-cta-inner reveal-on-scroll">
          <div className="lp-cta-left">
            <div className="lp-section-tag">GET STARTED — FREE</div>
            <h2 className="lp-cta-title">
              Your lungs deserve<br />
              better intelligence.
            </h2>
            <p className="lp-cta-sub">
              Built for people managing COPD, asthma, and chronic respiratory
              conditions — track your health in real-time and stay ahead of flare-ups.
            </p>
          </div>
          <div className="lp-cta-right">
            <Link to="/signup" className="lp-primary-cta lp-cta-lg" onClick={handleCtaClick}>
              Start for Free <ArrowRight size={16} />
            </Link>
            <Link to="/login" className="lp-ghost-cta lp-cta-sm-link">
              Already a member? View My Dashboard →
            </Link>
            <div className="lp-cta-assurance">
              <CheckCircle2 size={12} />
              <span>No credit card required · Free to get started</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
