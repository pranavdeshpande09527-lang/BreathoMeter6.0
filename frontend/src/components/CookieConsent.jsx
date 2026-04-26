/**
 * CookieConsent.jsx
 * HIGH-6: GDPR-aligned consent banner.
 * - Shown on first visit before any analytics (Sentry) are initialized.
 * - Persists decision to localStorage under key 'bm_cookie_consent'.
 * - 'Accept' → sets flag + fires window event for Sentry init.
 * - 'Decline' → sets flag, Sentry stays uninitialised.
 */
import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ShieldCheck, X } from 'lucide-react'

const CONSENT_KEY = 'bm_cookie_consent'

export function useCookieConsent() {
    return localStorage.getItem(CONSENT_KEY) // 'accepted' | 'declined' | null
}

export default function CookieConsent() {
    const [visible, setVisible] = useState(false)
    const location = useLocation()

    useEffect(() => {
        if (!localStorage.getItem(CONSENT_KEY)) {
            // Delay longer on auth pages so users can read the form first
            const isAuthPage = ['/login', '/signup'].includes(location.pathname)
            const delay = isAuthPage ? 3000 : 800
            const t = setTimeout(() => setVisible(true), delay)
            return () => clearTimeout(t)
        }
    }, [location.pathname])

    if (!visible) return null

    const respond = (choice) => {
        localStorage.setItem(CONSENT_KEY, choice)
        setVisible(false)
        // Notify the app so Sentry can be lazily initialised on 'accepted'
        window.dispatchEvent(new CustomEvent('bm:consent', { detail: { choice } }))
    }

    return (
        <>
        {/* Full-screen backdrop so banner never merges with page text */}
        <div
            onClick={() => respond('declined')}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9998,
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                animation: 'ccFadeIn 0.3s ease',
            }}
        />
        <div
            role="dialog"
            aria-live="polite"
            aria-label="Cookie and privacy consent"
            style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                width: 'min(560px, calc(100vw - 32px))',
                background: 'var(--color-surface)',
                border: '1.5px solid var(--color-border)',
                borderRadius: 20,
                boxShadow: '0 24px 64px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12)',
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                animation: 'ccSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)',
            }}
        >
            <style>{`
                @keyframes ccSlideUp {
                    from { opacity: 0; transform: translateX(-50%) translateY(24px); }
                    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
                }
                @keyframes ccFadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
            `}</style>

            {/* Dismiss without consent */}
            <button
                onClick={() => respond('declined')}
                style={{
                    position: 'absolute', top: 14, right: 14,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--color-text-2)', padding: 4, borderRadius: 8,
                    display: 'flex', alignItems: 'center',
                }}
                aria-label="Decline and close"
            >
                <X size={16} />
            </button>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                    flexShrink: 0, width: 40, height: 40, borderRadius: 12,
                    background: 'var(--color-primary-light, #eff6ff)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <ShieldCheck size={20} color="var(--color-primary)" />
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: 'var(--color-text)' }}>
                        Your Privacy Matters
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--color-text-2)', lineHeight: 1.55, margin: 0 }}>
                        We use <strong>session storage</strong> for authentication only — no tracking cookies are set.
                        We also use <strong>Sentry</strong> for anonymous error monitoring to improve reliability.
                        No health data is shared with third parties.{' '}
                        <a href="/privacy-policy" style={{ color: 'var(--color-primary)', textDecoration: 'underline' }}>
                            Privacy Policy
                        </a>
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                    onClick={() => respond('declined')}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: 13 }}
                >
                    Decline Optional
                </button>
                <button
                    onClick={() => respond('accepted')}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: 13, minWidth: 120 }}
                >
                    Accept &amp; Continue
                </button>
            </div>
        </div>
        </>
    )
}
