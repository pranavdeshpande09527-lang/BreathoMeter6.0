import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import PatientSidebar from './Sidebar'
import Topbar from './Topbar'
import HavaChatbot from './HavaChatbot'
import { applyLivingContext, recordPageVisit, getPersonalizedInsight } from '../utils/livingUI'

export default function PatientShell() {
    const location = useLocation()
    const contextInterval = useRef(null)
    const [insight, setInsight] = useState(null)

    // ── Apply Living UI context on mount and every 5 min ─────────────────────
    useEffect(() => {
        async function initContext() {
            let aqi = null
            let riskScore = null

            try {
                const cachedAqi = localStorage.getItem('bm_last_aqi')
                if (cachedAqi) aqi = parseFloat(cachedAqi)

                const cachedRisk = localStorage.getItem('bm_last_risk')
                if (cachedRisk) riskScore = parseFloat(cachedRisk)
            } catch (_) {}

            applyLivingContext({ aqi, riskScore })

            // Compute contextual insight
            const msg = getPersonalizedInsight({ aqi, riskScore })
            setInsight(msg)
        }

        initContext()
        contextInterval.current = setInterval(initContext, 5 * 60 * 1000)
        return () => clearInterval(contextInterval.current)
    }, [])

    // ── Track page visits for personalization ─────────────────────────────────
    useEffect(() => {
        recordPageVisit(location.pathname)
    }, [location.pathname])

    return (
        <div className="app-shell">
            <PatientSidebar />
            <div className="main-content living-main">
                <Topbar />
                <div className="page-content page-enter">
                    {/* Contextual Insight Banner — Living AI microcopy */}
                    {insight && (
                        <div
                            key={insight.message}
                            className={`living-insight-banner tone-${insight.tone}`}
                            role="status"
                            aria-live="polite"
                        >
                            <span className="living-insight-dot" aria-hidden="true" />
                            <span>{insight.message}</span>
                        </div>
                    )}
                    <Outlet />
                </div>
            </div>
        </div>
    )
}
