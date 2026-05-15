/**
 * TelemedicineFAB — Phase 7 Floating Action Button
 *
 * Persistent "Talk to a Pulmonologist" button visible to authenticated
 * patients throughout the entire dashboard. Specs:
 *   - position: fixed; bottom-right corner
 *   - Collapses to icon-only on mobile (< 640px)
 *   - Pulse animation respects prefers-reduced-motion
 *   - Keyboard accessible (Tab, Enter, Space)
 *   - aria-label always present
 *   - Only renders when a user session is active
 */
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Stethoscope, X } from 'lucide-react'

export default function TelemedicineFAB() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isDismissed, setIsDismissed]         = useState(false)
  const [isExpanded, setIsExpanded]           = useState(true)  // starts expanded, collapses on scroll

  /* Check auth state */
  useEffect(() => {
    const raw = sessionStorage.getItem('user_data') || localStorage.getItem('user_data')
    if (raw && raw !== 'undefined') {
      try {
        const user = JSON.parse(raw)
        const role = user?.user_metadata?.role || user?.role || 'patient'
        // Only show FAB for patients (not doctors)
        setIsAuthenticated(!!user?.id && role !== 'doctor')
      } catch (_) {}
    }
  }, [])

  /* Collapse to icon on scroll down, re-expand on scroll up */
  useEffect(() => {
    let lastY = window.scrollY
    const handleScroll = () => {
      const y = window.scrollY
      if (y > lastY + 40) setIsExpanded(false)  // scrolled down
      if (y < lastY - 40) setIsExpanded(true)   // scrolled up
      lastY = y
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isAuthenticated || isDismissed) return null

  return (
    <>
      <div className="tmfab-wrapper" role="complementary" aria-label="Telemedicine quick access">
        {/* Dismiss button */}
        <button
          className="tmfab-dismiss"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss telemedicine button"
          title="Dismiss"
        >
          <X size={10} />
        </button>

        {/* Main FAB */}
        <Link
          to="/chat/new"
          className={`tmfab-btn ${isExpanded ? 'tmfab-expanded' : 'tmfab-collapsed'}`}
          aria-label="Talk to a Pulmonologist — Start telemedicine session"
          title="Talk to a Pulmonologist"
        >
          <span className="tmfab-pulse-ring" aria-hidden="true" />
          <Stethoscope size={18} className="tmfab-icon" aria-hidden="true" />
          {isExpanded && (
            <span className="tmfab-label">Talk to a Pulmonologist</span>
          )}
        </Link>
      </div>

      <style>{`
        /* ── FAB Container ──────────────────────────────────────── */
        .tmfab-wrapper {
          position: fixed;
          bottom: 28px;
          right: 24px;
          z-index: 900;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
        }

        /* ── Dismiss X ──────────────────────────────────────────── */
        .tmfab-dismiss {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(30,41,59,0.85);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.2s;
          align-self: flex-end;
          margin-right: 4px;
        }
        .tmfab-wrapper:hover .tmfab-dismiss {
          opacity: 1;
        }
        .tmfab-dismiss:focus-visible {
          opacity: 1;
          outline: 2px solid #60A5FA;
          outline-offset: 2px;
        }

        /* ── Main Button ────────────────────────────────────────── */
        .tmfab-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: linear-gradient(135deg, #1d4ed8, #2563eb);
          color: #fff;
          font-size: 0.8125rem;
          font-weight: 600;
          font-family: var(--font-body, Inter, sans-serif);
          border-radius: 100px;
          padding: 12px 20px;
          text-decoration: none;
          box-shadow:
            0 4px 16px rgba(37,99,235,0.45),
            0 1px 4px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.15);
          transition:
            padding 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
            box-shadow 0.2s,
            transform 0.2s;
          position: relative;
          overflow: hidden;
          min-height: 48px;
          min-width: 48px;
        }
        .tmfab-btn:hover {
          transform: translateY(-2px);
          box-shadow:
            0 8px 24px rgba(37,99,235,0.55),
            0 2px 8px rgba(0,0,0,0.3),
            inset 0 1px 0 rgba(255,255,255,0.2);
        }
        .tmfab-btn:active {
          transform: translateY(0);
        }
        .tmfab-btn:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(37,99,235,0.5);
        }

        /* Collapsed state — icon only */
        .tmfab-collapsed {
          padding: 12px;
          justify-content: center;
        }

        /* ── Label ──────────────────────────────────────────────── */
        .tmfab-label {
          white-space: nowrap;
          overflow: hidden;
          max-width: 200px;
          transition: max-width 0.3s ease;
        }

        /* ── Icon ───────────────────────────────────────────────── */
        .tmfab-icon {
          flex-shrink: 0;
        }

        /* ── Pulse ring ─────────────────────────────────────────── */
        .tmfab-pulse-ring {
          position: absolute;
          inset: -4px;
          border-radius: 100px;
          border: 2px solid rgba(37,99,235,0.5);
          animation: tmfab-pulse 2.5s ease-out infinite;
          pointer-events: none;
        }
        @keyframes tmfab-pulse {
          0%   { opacity: 1; transform: scale(1); }
          70%  { opacity: 0; transform: scale(1.18); }
          100% { opacity: 0; transform: scale(1.18); }
        }

        /* ── Mobile: collapsed by default ───────────────────────── */
        @media (max-width: 640px) {
          .tmfab-btn {
            padding: 13px;
          }
          .tmfab-label {
            display: none;
          }
          .tmfab-wrapper {
            bottom: 80px;  /* above mobile bottom navigation */
            right: 16px;
          }
        }

        /* ── Reduced motion ─────────────────────────────────────── */
        @media (prefers-reduced-motion: reduce) {
          .tmfab-pulse-ring {
            animation: none;
          }
          .tmfab-btn {
            transition: none;
          }
        }
      `}</style>
    </>
  )
}
