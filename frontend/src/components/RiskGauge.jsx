import { useEffect, useState } from 'react'

/**
 * RiskGauge — Signature SVG semi-circular gauge
 * Premium: animated needle sweep, staged score reveal, organic motion
 */
export default function RiskGauge({ score = 64 }) {
    const cx = 110, cy = 90, r = 80
    const startAngle = Math.PI
    const totalAngle = Math.PI

    const [animatedScore, setAnimatedScore] = useState(0)
    const [labelVisible, setLabelVisible] = useState(false)

    useEffect(() => {
        // Brief pause before sweep — builds anticipation
        const t1 = setTimeout(() => {
            setAnimatedScore(score)
        }, 200)
        // Score number appears after needle settles
        const t2 = setTimeout(() => {
            setLabelVisible(true)
        }, 900)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [score])

    const polarToCartesian = (angle) => ({
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
    })

    const trackStart = polarToCartesian(startAngle)
    const trackEnd   = polarToCartesian(0)
    const trackPath  = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`

    const fillAngle  = startAngle - (animatedScore / 100) * totalAngle
    const fillEnd    = polarToCartesian(fillAngle)
    const largeArc   = (startAngle - fillAngle) > Math.PI ? 1 : 0
    const fillPath   = `M ${trackStart.x} ${trackStart.y} A ${r} ${r} 0 ${largeArc} 1 ${fillEnd.x} ${fillEnd.y}`

    // Needle points to animated score
    const needleAngle = startAngle - (animatedScore / 100) * totalAngle
    const needleEnd   = polarToCartesian(needleAngle)

    const getColor = (s) => {
        if (s < 35) return 'var(--color-safe)'
        if (s < 65) return 'var(--color-warning)'
        return 'var(--color-danger)'
    }

    const getLabel = (s) => {
        if (s < 35) return { label: 'Low Risk',      cls: 'badge-safe' }
        if (s < 65) return { label: 'Moderate Risk', cls: 'badge-warning' }
        return             { label: 'High Risk',      cls: 'badge-danger' }
    }

    const color  = getColor(score)
    const status = getLabel(score)

    // SVG transition string for the animated paths
    const svgTransition = 'all 0.9s cubic-bezier(0.16, 1, 0.3, 1)'

    return (
        <div className="rg-wrapper">
            <svg
                viewBox="0 0 220 145"
                width="100%"
                height="auto"
                style={{ maxWidth: '280px', overflow: 'visible' }}
                role="img"
                aria-label={`Risk score: ${score} out of 100 — ${status.label}`}
            >
                <defs>
                    {/* Zone gradients */}
                    <linearGradient id="rgLowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--color-safe)" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="var(--color-safe)" stopOpacity="0.15" />
                    </linearGradient>
                    <linearGradient id="rgModGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--color-warning)" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="var(--color-warning)" stopOpacity="0.15" />
                    </linearGradient>
                    <linearGradient id="rgHighGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="var(--color-danger)" stopOpacity="0.7" />
                        <stop offset="100%" stopColor="var(--color-danger)" stopOpacity="0.15" />
                    </linearGradient>
                    {/* Needle glow filter */}
                    <filter id="rgNeedleGlow" x="-100%" y="-100%" width="300%" height="300%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Zone arcs — track */}
                <path
                    d={`M ${polarToCartesian(Math.PI).x} ${polarToCartesian(Math.PI).y} A ${r} ${r} 0 0 1 ${polarToCartesian(Math.PI * 0.66).x} ${polarToCartesian(Math.PI * 0.66).y}`}
                    fill="none" stroke="url(#rgLowGrad)" strokeWidth="10" opacity="0.55"
                    strokeLinecap="round"
                />
                <path
                    d={`M ${polarToCartesian(Math.PI * 0.66).x} ${polarToCartesian(Math.PI * 0.66).y} A ${r} ${r} 0 0 1 ${polarToCartesian(Math.PI * 0.33).x} ${polarToCartesian(Math.PI * 0.33).y}`}
                    fill="none" stroke="url(#rgModGrad)" strokeWidth="10" opacity="0.55"
                    strokeLinecap="round"
                />
                <path
                    d={`M ${polarToCartesian(Math.PI * 0.33).x} ${polarToCartesian(Math.PI * 0.33).y} A ${r} ${r} 0 0 1 ${polarToCartesian(0).x} ${polarToCartesian(0).y}`}
                    fill="none" stroke="url(#rgHighGrad)" strokeWidth="10" opacity="0.55"
                    strokeLinecap="round"
                />

                {/* Score arc — animated fill */}
                <path
                    d={fillPath}
                    fill="none"
                    stroke={color}
                    strokeWidth="10"
                    strokeLinecap="round"
                    style={{
                        transition: svgTransition,
                        filter: `drop-shadow(0px 0px 5px ${color === 'var(--color-safe)' ? 'rgba(22,163,74,0.25)' : color === 'var(--color-warning)' ? 'rgba(217,119,6,0.25)' : 'rgba(220,38,38,0.25)'})`,
                    }}
                />

                {/* Needle — subtle, precise pointer */}
                <line
                    x1={cx} y1={cy}
                    x2={needleEnd.x} y2={needleEnd.y}
                    stroke={color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    opacity="0.9"
                    style={{ transition: svgTransition }}
                />

                {/* Needle pivot */}
                <circle
                    cx={cx} cy={cy} r="5.5"
                    fill={color}
                    stroke="var(--color-surface)"
                    strokeWidth="2.5"
                    style={{ transition: 'fill 0.4s cubic-bezier(0.4,0,0.2,1)' }}
                />

                {/* Score — staged reveal after needle settles */}
                <text
                    x={cx} y={cy + 36}
                    textAnchor="middle"
                    style={{
                        fill: 'var(--color-text)',
                        fontSize: '32px',
                        fontWeight: 800,
                        fontFamily: 'Inter, sans-serif',
                        opacity: labelVisible ? 1 : 0,
                        transition: 'opacity 0.4s cubic-bezier(0.4,0,0.2,1)',
                    }}
                >
                    {score}
                </text>

                {/* Zone labels */}
                <text x={cx - r + 8} y={cy + 22} textAnchor="middle"
                    style={{ fill: 'var(--color-safe)', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.8 }}>
                    LOW
                </text>
                <text x={cx + r - 8} y={cy + 22} textAnchor="middle"
                    style={{ fill: 'var(--color-danger)', fontSize: '10px', fontFamily: 'Inter, sans-serif', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.8 }}>
                    HIGH
                </text>
            </svg>

            <style>{`
        .rg-wrapper {
          display: flex;
          justify-content: center;
          width: 100%;
        }
      `}</style>
        </div>
    )
}
