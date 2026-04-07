import { useEffect, useState } from 'react'
import { LogIn, Shield, Clock } from 'lucide-react'

/**
 * SessionExpiryModal
 * Listens for the global 'session-expired' CustomEvent fired by api.js
 * when a 401 is received. Shows a non-dismissible modal prompting re-login.
 * Preserves the current page URL so the user returns after re-auth.
 */
export default function SessionExpiryModal() {
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        const handler = () => setVisible(true)
        window.addEventListener('session-expired', handler)
        return () => window.removeEventListener('session-expired', handler)
    }, [])

    const handleSignIn = () => {
        // Clear auth storage
        localStorage.removeItem('supabase_token')
        localStorage.removeItem('user_data')
        sessionStorage.removeItem('supabase_token')
        sessionStorage.removeItem('user_data')
        // Redirect — save return path so login can redirect back
        const returnTo = encodeURIComponent(window.location.pathname + window.location.search)
        window.location.href = `/login?returnTo=${returnTo}`
    }

    if (!visible) return null

    return (
        <>
            {/* Backdrop */}
            <div style={{
                position: 'fixed', inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                zIndex: 9998,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animation: 'sem-fadein 0.2s ease',
            }}>
                {/* Modal card */}
                <div style={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-xl)',
                    boxShadow: 'var(--shadow-xl)',
                    padding: '36px 32px',
                    width: '100%',
                    maxWidth: '380px',
                    textAlign: 'center',
                    animation: 'sem-slidein 0.25s cubic-bezier(0.4,0,0.2,1)',
                    zIndex: 9999,
                }}>
                    {/* Icon */}
                    <div style={{
                        width: 60, height: 60,
                        borderRadius: '50%',
                        background: 'var(--color-warning-light, rgba(245,158,11,0.12))',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        border: '1px solid var(--color-warning-muted, rgba(245,158,11,0.25))',
                    }}>
                        <Clock size={26} color="var(--color-warning, #F59E0B)" />
                    </div>

                    <h2 style={{
                        fontSize: 18,
                        fontWeight: 800,
                        color: 'var(--color-text)',
                        marginBottom: 8,
                        letterSpacing: '-0.3px',
                    }}>
                        Session Expired
                    </h2>

                    <p style={{
                        fontSize: 13.5,
                        color: 'var(--color-muted)',
                        lineHeight: 1.6,
                        marginBottom: 28,
                        maxWidth: 280,
                        margin: '0 auto 28px',
                    }}>
                        Your session has timed out for security. Please sign in again to continue where you left off.
                    </p>

                    {/* Security badge */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        justifyContent: 'center',
                        fontSize: 11,
                        color: 'var(--color-subtle)',
                        marginBottom: 20,
                        fontWeight: 500,
                    }}>
                        <Shield size={11} color="var(--color-safe, #10B981)" />
                        <span>HIPAA-compliant session management</span>
                    </div>

                    <button
                        onClick={handleSignIn}
                        style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            background: 'var(--color-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 'var(--radius-sm)',
                            padding: '11px 20px',
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            transition: 'opacity 0.15s',
                        }}
                        onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                        onMouseOut={e => e.currentTarget.style.opacity = '1'}
                    >
                        <LogIn size={15} />
                        Sign In Again
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes sem-fadein  { from { opacity: 0 } to { opacity: 1 } }
                @keyframes sem-slidein { from { opacity: 0; transform: translateY(16px) scale(0.97) } to { opacity: 1; transform: none } }
            `}</style>
        </>
    )
}
