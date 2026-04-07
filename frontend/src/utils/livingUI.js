/**
 * BREATHOMETER — Living UI Context Engine v2
 * ============================================
 * Dynamically adapts CSS custom properties based on:
 *   1. Time of day  (morning / day / evening / night)
 *   2. AQI level    (good / moderate / unhealthy / hazardous)
 *   3. Health risk  (low / moderate / high)
 *   4. Personalization (frequent pages, recency)
 *   5. Gradient motion controller
 *   6. Focus system (dim background on modal/dropdown)
 *
 * All changes are token-level (CSS vars on :root).
 * Zero structural or color-palette changes.
 */

// ─ Time context ──────────────────────────────────────────────────────────────
export function getTimeContext() {
    const h = new Date().getHours()
    if (h >= 5  && h < 10) return 'morning'
    if (h >= 10 && h < 18) return 'day'
    if (h >= 18 && h < 21) return 'evening'
    return 'night'
}

// ─ AQI band ──────────────────────────────────────────────────────────────────
export function getAqiBand(aqi) {
    if (!aqi || aqi <= 50)  return 'good'
    if (aqi <= 100)         return 'moderate'
    if (aqi <= 200)         return 'unhealthy'
    return 'hazardous'
}

// ─ Risk band ─────────────────────────────────────────────────────────────────
export function getRiskBand(riskScore) {
    if (!riskScore || riskScore < 30)  return 'low'
    if (riskScore < 60)                return 'moderate'
    return 'high'
}

// ─ Token overrides ───────────────────────────────────────────────────────────
const TOKEN_MAP = {
    // Time-of-day surface & shadow adjustments
    time: {
        morning: {
            '--living-surface-brightness': '1.01',
            '--living-shadow-intensity':   '0.06',
            '--living-ambient-opacity':    '0',
            '--living-gradient-speed':     '14s',
        },
        day: {
            '--living-surface-brightness': '1.0',
            '--living-shadow-intensity':   '0.05',
            '--living-ambient-opacity':    '0',
            '--living-gradient-speed':     '18s',
        },
        evening: {
            '--living-surface-brightness': '0.98',
            '--living-shadow-intensity':   '0.07',
            '--living-ambient-opacity':    '0.015',
            '--living-gradient-speed':     '12s',
        },
        night: {
            '--living-surface-brightness': '0.95',
            '--living-shadow-intensity':   '0.09',
            '--living-ambient-opacity':    '0.025',
            '--living-gradient-speed':     '10s',
        },
    },

    // AQI-based ambient glow color
    aqi: {
        good:      { '--living-aqi-glow': 'rgba(22, 163, 74, 0)',    '--living-aqi-border': 'rgba(22, 163, 74, 0)' },
        moderate:  { '--living-aqi-glow': 'rgba(217, 119, 6, 0.04)', '--living-aqi-border': 'rgba(217, 119, 6, 0.1)' },
        unhealthy: { '--living-aqi-glow': 'rgba(217, 119, 6, 0.07)', '--living-aqi-border': 'rgba(217, 119, 6, 0.15)' },
        hazardous: { '--living-aqi-glow': 'rgba(220, 38, 38, 0.08)', '--living-aqi-border': 'rgba(220, 38, 38, 0.18)' },
    },

    // Risk-based glow intensity amplifier
    risk: {
        low:      { '--living-risk-glow': '0',    '--living-risk-scale': '1' },
        moderate: { '--living-risk-glow': '0.03', '--living-risk-scale': '1.002' },
        high:     { '--living-risk-glow': '0.07', '--living-risk-scale': '1.004' },
    },
}

// ─ Apply context to :root ─────────────────────────────────────────────────────
export function applyLivingContext({ aqi = null, riskScore = null } = {}) {
    const root  = document.documentElement
    const time  = getTimeContext()
    const aqiBand  = getAqiBand(aqi)
    const riskBand = getRiskBand(riskScore)

    const tokens = {
        ...TOKEN_MAP.time[time],
        ...TOKEN_MAP.aqi[aqiBand],
        ...TOKEN_MAP.risk[riskBand],
    }

    for (const [key, val] of Object.entries(tokens)) {
        root.style.setProperty(key, val)
    }

    // Expose context class on <body> for CSS targeting
    document.body.dataset.timeContext = time
    document.body.dataset.aqiContext  = aqiBand
    document.body.dataset.riskContext = riskBand
}

// ─ Personalization (localStorage) ────────────────────────────────────────────
const VISITS_KEY  = 'bm_page_visits'
const RECENCY_KEY = 'bm_page_recency'

export function recordPageVisit(path) {
    try {
        const raw    = localStorage.getItem(VISITS_KEY)
        const visits = raw ? JSON.parse(raw) : {}
        visits[path] = (visits[path] || 0) + 1
        localStorage.setItem(VISITS_KEY, JSON.stringify(visits))

        // Track recency (ISO timestamp per path)
        const recRaw  = localStorage.getItem(RECENCY_KEY)
        const recency = recRaw ? JSON.parse(recRaw) : {}
        recency[path] = new Date().toISOString()
        localStorage.setItem(RECENCY_KEY, JSON.stringify(recency))
    } catch (_) {}
}

export function getTopPages(n = 3) {
    try {
        const raw    = localStorage.getItem(VISITS_KEY)
        const visits = raw ? JSON.parse(raw) : {}
        return Object.entries(visits)
            .sort((a, b) => b[1] - a[1])
            .slice(0, n)
            .map(([path]) => path)
    } catch (_) {
        return []
    }
}

export function getPersonalizedInsight({ aqi = null, riskScore = null } = {}) {
    const time    = getTimeContext()
    const aqiBand = getAqiBand(aqi)
    const risk    = getRiskBand(riskScore)

    // Priority: high risk > hazardous AQI > moderate AQI > time-based
    if (risk === 'high') {
        return {
            message: 'Your respiratory risk is elevated. Consider consulting a specialist soon.',
            tone: 'danger',
        }
    }
    if (aqiBand === 'hazardous') {
        return {
            message: 'Hazardous air quality detected. Limit outdoor exposure and wear a mask.',
            tone: 'danger',
        }
    }
    if (aqiBand === 'unhealthy') {
        return {
            message: 'Air quality is worsening. Sensitive individuals should stay indoors.',
            tone: 'warning',
        }
    }
    if (risk === 'moderate' && aqiBand === 'moderate') {
        return {
            message: 'Moderate risk + air quality. Stay aware and track your symptoms.',
            tone: 'warning',
        }
    }
    if (aqiBand === 'moderate') {
        return {
            message: 'Air quality is moderate today. Consider precautions for outdoor activity.',
            tone: 'info',
        }
    }
    // Time-based calm messages
    const timeMessages = {
        morning: { message: 'Good morning. This is a great time to take your breath analysis.', tone: 'safe' },
        day:     { message: 'Your recent trend is stable. Keep up your wellness routine.', tone: 'safe' },
        evening: { message: 'Evening check-in: air quality typically shifts after sunset.', tone: 'info' },
        night:   { message: 'Resting well supports respiratory recovery. Avoid late-night exertion.', tone: 'info' },
    }
    return timeMessages[time] || null
}

// ─ Focus System ──────────────────────────────────────────────────────────────
let focusDepth = 0

export function activateFocus() {
    focusDepth++
    document.body.classList.add('living-focus-active')
}

export function deactivateFocus() {
    focusDepth = Math.max(0, focusDepth - 1)
    if (focusDepth === 0) {
        document.body.classList.remove('living-focus-active')
    }
}

// ─ Silent feedback (haptics if available) ────────────────────────────────────
export function silentFeedback(type = 'success') {
    if (!navigator.vibrate) return
    if (type === 'success') navigator.vibrate(8)
    if (type === 'error')   navigator.vibrate([10, 40, 10])
}

// ─ Success/error pulse on element ────────────────────────────────────────────
export function pulseFeedback(element, type = 'success') {
    if (!element) return
    const cls = type === 'success' ? 'living-pulse-success' : 'living-pulse-error'
    element.classList.add(cls)
    setTimeout(() => element.classList.remove(cls), 800)
    silentFeedback(type)
}

// ─ Animated counter (smooth value update) ────────────────────────────────────
export function animateCounter(el, from, to, duration = 600) {
    if (!el) return
    const start = performance.now()
    const diff  = to - from
    function step(now) {
        const t   = Math.min((now - start) / duration, 1)
        const ease = 1 - Math.pow(1 - t, 3) // cubic ease-out
        el.textContent = Math.round(from + diff * ease)
        if (t < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
}
