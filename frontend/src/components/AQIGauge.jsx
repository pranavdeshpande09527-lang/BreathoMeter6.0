import { useEffect, useRef, useState } from 'react'

/**
 * AQIGauge — Signature circular AQI indicator
 * Premium: animated ring entrance, organic motion, soft glow halo
 */
export default function AQIGauge({ aqi, location = 'Loading location...' }) {
    const displayAqi = aqi != null ? aqi : '–'
    const radius = 72
    const stroke = 8
    const normalizedR = radius - stroke / 2
    const circumference = normalizedR * 2 * Math.PI

    // Animate from empty → filled on mount / value change
    const [animatedOffset, setAnimatedOffset] = useState(circumference)
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Stagger: let ring mount first, then sweep in
        const t1 = setTimeout(() => setVisible(true), 60)
        const t2 = setTimeout(() => {
            const target = aqi != null
                ? circumference - Math.min(aqi / 500, 1) * circumference
                : circumference
            setAnimatedOffset(target)
        }, 120)
        return () => { clearTimeout(t1); clearTimeout(t2) }
    }, [aqi, circumference])

    const getInfo = (val) => {
        if (val <= 50)  return { label: 'Good',         color: 'var(--color-aqi-1)', cls: 'badge-aqi-1' }
        if (val <= 100) return { label: 'Satisfactory', color: 'var(--color-aqi-2)', cls: 'badge-aqi-2' }
        if (val <= 200) return { label: 'Moderate',     color: 'var(--color-aqi-3)', cls: 'badge-aqi-3' }
        if (val <= 300) return { label: 'Poor',         color: 'var(--color-aqi-4)', cls: 'badge-aqi-4' }
        if (val <= 400) return { label: 'Very Poor',    color: 'var(--color-aqi-5)', cls: 'badge-aqi-5' }
        return             { label: 'Severe',       color: 'var(--color-aqi-6)', cls: 'badge-aqi-6' }
    }

    const info = aqi != null
        ? getInfo(aqi)
        : { label: 'Awaiting data…', color: 'var(--color-border)', cls: '' }

    const glowColor = aqi != null ? info.color : 'transparent'

    return (
        <div className="aqig-wrapper" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
            <div className="aqig-ring" style={{ '--glow-color': glowColor }}>
                <svg
                    width={radius * 2} height={radius * 2}
                    role="img"
                    aria-label={`Air Quality Index: ${displayAqi} — ${info.label}`}
                    style={{ overflow: 'visible' }}
                >
                    <defs>
                        <filter id="aqiGlow" x="-40%" y="-40%" width="180%" height="180%">
                            <feGaussianBlur stdDeviation="3" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                    </defs>

                    {/* Track */}
                    <circle
                        cx={radius} cy={radius} r={normalizedR}
                        fill="none"
                        stroke="var(--color-border)"
                        strokeWidth={stroke}
                        strokeLinecap="round"
                    />

                    {/* Glow layer — soft halo behind active arc */}
                    {aqi != null && (
                        <circle
                            cx={radius} cy={radius} r={normalizedR}
                            fill="none"
                            stroke={info.color}
                            strokeWidth={stroke + 6}
                            strokeDasharray={`${circumference} ${circumference}`}
                            strokeDashoffset={animatedOffset}
                            strokeLinecap="round"
                            opacity="0.12"
                            style={{
                                transform: 'rotate(-90deg)',
                                transformOrigin: '50% 50%',
                                transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1)',
                                filter: 'blur(4px)',
                            }}
                        />
                    )}

                    {/* Active arc — main ring */}
                    <circle
                        cx={radius} cy={radius} r={normalizedR}
                        fill="none"
                        stroke={info.color}
                        strokeWidth={stroke}
                        strokeDasharray={`${circumference} ${circumference}`}
                        strokeDashoffset={animatedOffset}
                        strokeLinecap="round"
                        style={{
                            transform: 'rotate(-90deg)',
                            transformOrigin: '50% 50%',
                            transition: 'stroke-dashoffset 1.1s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s cubic-bezier(0.4,0,0.2,1)',
                        }}
                    />

                    {/* AQI number */}
                    <text
                        x={radius} y={radius - 5}
                        textAnchor="middle"
                        style={{
                            fill: aqi != null ? info.color : 'var(--color-muted)',
                            fontSize: '28px',
                            fontWeight: 700,
                            fontFamily: 'Inter, sans-serif',
                            transition: 'fill 0.4s cubic-bezier(0.4,0,0.2,1)',
                        }}
                    >
                        {displayAqi}
                    </text>

                    {/* AQI label */}
                    <text
                        x={radius} y={radius + 16}
                        textAnchor="middle"
                        style={{
                            fill: 'var(--color-subtle)',
                            fontSize: '10px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 700,
                            letterSpacing: '1px',
                            textTransform: 'uppercase',
                        }}
                    >
                        AQI
                    </text>
                </svg>
            </div>

            {aqi != null && (
                <div style={{
                    fontSize: '10px',
                    color: 'var(--color-subtle)',
                    textAlign: 'center',
                    maxWidth: '160px',
                    marginTop: '-6px',
                    fontStyle: 'italic',
                    lineHeight: 1.5,
                }}>
                    AQI calculated using CPCB (India) standard.
                </div>
            )}

            <div className="aqig-info">
                {info.cls && <span className={`badge ${info.cls}`}>{info.label}</span>}
                {!info.cls && <span className="text-meta">{info.label}</span>}
                <div className="aqig-location">📍 {location}</div>
            </div>

            <style>{`
        .aqig-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .aqig-ring {
          position: relative;
          /* Soft ambient glow synced to AQI color */
          filter: drop-shadow(0 2px 12px color-mix(in srgb, var(--glow-color, transparent) 22%, transparent));
          transition: filter 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        .aqig-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .aqig-location {
          font-size: 12px;
          color: var(--color-muted);
          font-weight: 500;
        }
      `}</style>
        </div>
    )
}
